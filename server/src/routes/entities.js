const express = require('express');
const { prisma } = require('../db');
const { entityNames, canCreate, checkRecord, readWhereClause, sanitizeWrite, isAdmin, isVisible } = require('../entityConfig');
const { emitEntityEvent } = require('../realtime');
const { notifyNewProduct, recomputeProductRating } = require('../functions');

const router = express.Router();

// Every list endpoint is backed by an unbounded findMany unless the caller
// supplies `limit` — without a hard ceiling a single request (or a hostile
// client) can pull an entire multi-million-row table into memory.
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

function clampLimit(limit) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function serialize(record) {
  return {
    id: record.id,
    ...record.data,
    created_by_id: record.createdById,
    created_by: record.createdByEmail,
    created_date: record.createdAt.toISOString(),
    updated_date: record.updatedAt.toISOString(),
  };
}

function orderByFromSort(sort) {
  if (sort === '-created_date') return { createdAt: 'desc' };
  if (sort === 'created_date') return { createdAt: 'asc' };
  if (sort === '-updated_date') return { updatedAt: 'desc' };
  if (sort === 'updated_date') return { updatedAt: 'asc' };
  return { createdAt: 'desc' };
}

function whereFromConditions(conditions) {
  if (!conditions || Object.keys(conditions).length === 0) return {};
  const AND = Object.entries(conditions).map(([key, value]) => {
    if (key === 'id') return { id: value };
    if (key === 'created_by') return { createdByEmail: value };
    return { data: { path: [key], equals: value } };
  });
  return { AND };
}

function validateEntity(req, res, next) {
  const { entity } = req.params;
  if (entity === 'User') {
    return res.status(400).json({ error: 'Use /api/auth for the User entity' });
  }
  if (!entityNames.includes(entity)) {
    return res.status(404).json({ error: `Unknown entity: ${entity}` });
  }
  req.entity = entity;
  // Kept alongside the model so a handler can reach the same model on a
  // transaction client (`tx[modelKey]`), which is a different object.
  req.modelKey = entity.charAt(0).toLowerCase() + entity.slice(1);
  req.model = prisma[req.modelKey];
  next();
}

router.use('/:entity', validateEntity);

// List / filter — POST body: { where?: {...}, sort?: string, limit?: number }
router.post('/:entity/query', async (req, res) => {
  const { entity, model } = req;
  const { where = {}, sort, limit } = req.body || {};
  const rlsWhere = readWhereClause(entity, req.user);
  const combined = { AND: [rlsWhere, whereFromConditions(where)] };
  const records = await model.findMany({
    where: combined,
    orderBy: orderByFromSort(sort),
    take: clampLimit(limit),
  });
  // Test products / test-order reviews are stripped for everyone but an admin,
  // so they never reach a listing, a search or a rating (see entityConfig.js).
  res.json(records.filter((r) => isVisible(entity, r, req.user)).map(serialize));
});

router.get('/:entity/:id', async (req, res) => {
  const { entity, model } = req;
  const record = await model.findUnique({ where: { id: req.params.id } });
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (!checkRecord(entity, 'read', record, req.user)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // A customer following a direct link to a test product gets the same answer
  // as for a product that doesn't exist.
  if (!isVisible(entity, record, req.user)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(serialize(record));
});

// A test product may only ever be bought by an admin, and an order that
// contains one is flagged `is_test_order` so it stays out of revenue, product
// purchase counts and the dashboard's metrics. Flagging happens here rather
// than on the client because the client is the untrusted party: the buyer
// picks the product ids, so the server is what decides whether they're test.
async function applyTestProductRules(entity, data, user) {
  let productIds = [];
  if (entity === 'Order') productIds = (data.items || []).map((i) => i.product_id).filter(Boolean);
  else if (entity === 'CartItem' && data.product_id) productIds = [data.product_id];
  if (productIds.length === 0) return data;

  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (!products.some((p) => p.data?.is_test_product === true)) return data;

  if (!isAdmin(user)) {
    const err = new Error('This product is not available for purchase');
    err.status = 400;
    throw err;
  }
  return entity === 'Order' ? { ...data, is_test_order: true } : data;
}

router.post('/:entity', async (req, res, next) => {
  const { entity, model } = req;
  if (!canCreate(entity, req.user)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const data = await applyTestProductRules(
      entity,
      sanitizeWrite(entity, req.body || {}, req.user, 'create'),
      req.user
    );
    const record = await model.create({
      data: {
        data,
        createdById: req.user?.id || null,
        createdByEmail: req.user?.email || null,
      },
    });
    const serialized = serialize(record);
    emitEntityEvent(entity, 'create', serialized);
    res.status(201).json(serialized);
  } catch (err) {
    // Express 4 doesn't forward async throws — hand it to the error handler.
    next(err);
  }
});

router.put('/:entity/:id', async (req, res) => {
  const { entity, model } = req;
  const existing = await model.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (!checkRecord(entity, 'update', existing, req.user)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const patch = sanitizeWrite(entity, req.body || {}, req.user, 'update');
  const record = await model.update({
    where: { id: req.params.id },
    data: { data: { ...existing.data, ...patch } },
  });
  const serialized = serialize(record);
  emitEntityEvent(entity, 'update', serialized);

  // Replicates the Base44 "on Product publish" entity automation.
  if (entity === 'Product' && !existing.data.published && record.data.published) {
    notifyNewProduct(serialized).catch((err) => console.error('notifyNewProduct failed:', err));
  }

  // Keep the product's denormalized rating in sync whenever a review is
  // approved/unapproved by an admin (see routes/reviews.js for creation).
  if (entity === 'Review' && existing.data.status !== record.data.status) {
    if (existing.data.status === 'approved' || record.data.status === 'approved') {
      recomputeProductRating(record.data.product_id).catch((err) => console.error('recomputeProductRating failed:', err));
    }
  }

  res.json(serialized);
});

router.delete('/:entity/:id', async (req, res, next) => {
  const { entity, model, modelKey } = req;
  const existing = await model.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (!checkRecord(entity, 'delete', existing, req.user)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Deleting a post-delivery review must free up the order item again —
  // otherwise the buyer stays permanently stuck on "✓ Reviewed" with no
  // review to show for it (see routes/reviews.js for reviewed_item_ids).
  const unlocksOrderItem =
    entity === 'Review' && !!existing.data.order_id && !!existing.data.order_item_id;

  // Both writes go in one transaction. They used to be a fire-and-forget
  // promise chain whose failure was only logged: the review would be gone
  // while its order item stayed locked, and the caller got a 204 saying all
  // was well. Now either both land or neither does, and a failure is a 500.
  let updatedOrder = null;
  try {
    updatedOrder = await prisma.$transaction(async (tx) => {
      await tx[modelKey].delete({ where: { id: req.params.id } });
      if (!unlocksOrderItem) return null;

      const order = await tx.order.findUnique({ where: { id: existing.data.order_id } });
      if (!order) return null;
      const reviewedIds = (order.data.reviewed_item_ids || []).filter(
        (id) => id !== existing.data.order_item_id
      );
      return tx.order.update({
        where: { id: order.id },
        data: { data: { ...order.data, reviewed_item_ids: reviewedIds } },
      });
    });
  } catch (err) {
    // Express 4 doesn't forward async throws — hand it to the error handler.
    return next(err);
  }

  emitEntityEvent(entity, 'delete', serialize(existing));
  if (updatedOrder) emitEntityEvent('Order', 'update', serialize(updatedOrder));

  if (entity === 'Review' && existing.data.status === 'approved') {
    recomputeProductRating(existing.data.product_id).catch((err) => console.error('recomputeProductRating failed:', err));
  }

  res.status(204).end();
});

module.exports = { router, serialize };
