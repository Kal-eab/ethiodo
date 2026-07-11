const express = require('express');
const { prisma } = require('../db');
const { requireAuth } = require('../auth');
const { emitEntityEvent } = require('../realtime');
const { serialize } = require('./entities');

const router = express.Router();

const MAX_SCREENSHOTS = 4;
const MAX_URL_LENGTH = 2000;

// Buyers transfer a 10% deposit to place the order (see src/pages/DirectPayment.jsx);
// the remaining 90% is collected once the order has been delivered.
const DEPOSIT_RATE = 0.1;

function finalAmountFor(total) {
  return Math.round((total || 0) * (1 - DEPOSIT_RATE));
}

// The buyer's proof of the final (90%) payment. Orders are admin-only for
// writes in the generic entity CRUD (see entityConfig.js), so this is the one
// narrow path a customer has to touch their own order: it accepts screenshots
// and nothing else, and only while the order is actually awaiting that payment.
router.post('/:id/final-payment', requireAuth, async (req, res) => {
  try {
    const { screenshots } = req.body || {};
    if (!Array.isArray(screenshots) || screenshots.length < 1 || screenshots.length > MAX_SCREENSHOTS) {
      return res.status(400).json({ error: `Attach between 1 and ${MAX_SCREENSHOTS} payment screenshots` });
    }
    if (!screenshots.every((url) => typeof url === 'string' && url.length > 0 && url.length <= MAX_URL_LENGTH)) {
      return res.status(400).json({ error: 'Invalid screenshot URL' });
    }

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.createdById !== req.user.id) {
      return res.status(403).json({ error: 'You can only pay for your own orders' });
    }

    // Rejects the "customer pays the rest before the order is delivered" case —
    // the stage is only opened by the admin marking the order delivered.
    const stage = order.data.final_payment_status;
    if (stage !== 'awaiting_payment' && stage !== 'awaiting_confirmation') {
      return res.status(400).json({ error: 'This order is not awaiting a final payment' });
    }

    // A re-upload replaces the previous proof, so the seller only ever reviews
    // the latest one.
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        data: {
          ...order.data,
          final_payment_status: 'awaiting_confirmation',
          final_payment_screenshots: screenshots,
          final_payment_submitted_date: new Date().toISOString(),
        },
      },
    });

    const serialized = serialize(updated);
    emitEntityEvent('Order', 'update', serialized);

    const amount = finalAmountFor(order.data.total);
    const notification = await prisma.notification.create({
      data: {
        createdById: req.user.id,
        createdByEmail: req.user.email,
        data: {
          type: 'order',
          content: `${req.user.fullName || req.user.email} sent the final payment proof — ${amount.toLocaleString('en-US')} Birr (order #${order.id.slice(-8).toUpperCase()})`,
          link: '/admin/orders',
          is_read: false,
        },
      },
    });
    emitEntityEvent('Notification', 'create', serialize(notification));

    res.json(serialized);
  } catch (err) {
    console.error('POST /api/orders/:id/final-payment failed:', err);
    res.status(500).json({ error: 'Failed to submit final payment proof' });
  }
});

module.exports = router;
