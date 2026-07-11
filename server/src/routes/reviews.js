const express = require('express');
const { prisma } = require('../db');
const { requireAuth } = require('../auth');
const { emitEntityEvent } = require('../realtime');
const { serialize } = require('./entities');

const router = express.Router();

const MIN_BODY_LENGTH = 10;
const MIN_PHOTOS = 1;
const MAX_PHOTOS = 4;

function orderItemId(orderId, productId) {
  return `${orderId}::${productId}`;
}

// Post-delivery, verified-buyer review — one per order item. Unlike the
// generic /api/entities/Review create route, this enforces the full set of
// business rules (own order, delivered status, not already reviewed) that
// don't fit the generic entity CRUD/RLS model.
router.post('/', requireAuth, async (req, res) => {
  try {
    const { product_id, order_id, rating, body, photos } = req.body || {};

    if (!product_id || !order_id) {
      return res.status(400).json({ error: 'product_id and order_id are required' });
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    if (typeof body !== 'string' || body.trim().length < MIN_BODY_LENGTH) {
      return res.status(400).json({ error: `Review text must be at least ${MIN_BODY_LENGTH} characters` });
    }
    if (!Array.isArray(photos) || photos.length < MIN_PHOTOS || photos.length > MAX_PHOTOS) {
      return res.status(400).json({ error: `Attach between ${MIN_PHOTOS} and ${MAX_PHOTOS} photos` });
    }

    const order = await prisma.order.findUnique({ where: { id: order_id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.createdById !== req.user.id) {
      return res.status(403).json({ error: 'You can only review your own orders' });
    }
    if (order.data.status !== 'delivered') {
      return res.status(400).json({ error: 'This order is not delivered yet' });
    }

    const items = order.data.items || [];
    const item = items.find((i) => i.product_id === product_id);
    if (!item) {
      return res.status(400).json({ error: 'That product is not part of this order' });
    }

    const itemId = orderItemId(order.id, product_id);
    const reviewedIds = order.data.reviewed_item_ids || [];
    if (reviewedIds.includes(itemId)) {
      return res.status(409).json({ error: 'You already reviewed this item' });
    }

    const existingReview = await prisma.review.findFirst({
      where: { data: { path: ['order_item_id'], equals: itemId } },
    });
    if (existingReview) {
      return res.status(409).json({ error: 'You already reviewed this item' });
    }

    const record = await prisma.review.create({
      data: {
        createdById: req.user.id,
        createdByEmail: req.user.email,
        data: {
          product_id,
          order_id,
          order_item_id: itemId,
          rating: ratingNum,
          body: body.trim(),
          photos,
          reviewer_name: req.user.fullName || req.user.email,
          reviewer_email: req.user.email,
          verified_buyer: true,
          status: 'pending',
          featured: false,
          // A review left on a test order is test data: it never reaches the
          // storefront and never moves the product's rating (see functions.js).
          is_test_review: order.data.is_test_order === true,
        },
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { id: order_id },
      data: { data: { ...order.data, reviewed_item_ids: [...reviewedIds, itemId] } },
    });

    const serializedReview = serialize(record);
    const serializedOrder = serialize(updatedOrder);

    emitEntityEvent('Review', 'create', serializedReview);
    emitEntityEvent('Order', 'update', serializedOrder);

    res.status(201).json({ review: serializedReview, order: serializedOrder });
  } catch (err) {
    console.error('POST /api/reviews failed:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

module.exports = router;
