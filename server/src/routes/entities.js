const express = require('express');
const { prisma } = require('../db');
const { entityNames, canCreate, checkRecord, readWhereClause, sanitizeWrite } = require('../entityConfig');
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
  req.model = prisma[entity.charAt(0).toLowerCase() + entity.slice(1)];
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
  res.json(records.map(serialize));
});

router.get('/:entity/:id', async (req, res) => {
  const { entity, model } = req;
  const record = await model.findUnique({ where: { id: req.params.id } });
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (!checkRecord(entity, 'read', record, req.user)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(serialize(record));
});

router.post('/:entity', async (req, res) => {
  const { entity, model } = req;
  if (!canCreate(entity, req.user)) return res.status(403).json({ error: 'Forbidden' });
  const record = await model.create({
    data: {
      data: sanitizeWrite(entity, req.body || {}, req.user, 'create'),
      createdById: req.user?.id || null,
      createdByEmail: req.user?.email || null,
    },
  });
  const serialized = serialize(record);
  emitEntityEvent(entity, 'create', serialized);
  res.status(201).json(serialized);
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

router.delete('/:entity/:id', async (req, res) => {
  const { entity, model } = req;
  const existing = await model.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (!checkRecord(entity, 'delete', existing, req.user)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await model.delete({ where: { id: req.params.id } });
  emitEntityEvent(entity, 'delete', serialize(existing));

  if (entity === 'Review' && existing.data.status === 'approved') {
    recomputeProductRating(existing.data.product_id).catch((err) => console.error('recomputeProductRating failed:', err));
  }

  // Deleting a post-delivery review must free up the order item again —
  // otherwise the buyer stays permanently stuck on "✓ Reviewed" with no
  // review to show for it (see routes/reviews.js for reviewed_item_ids).
  if (entity === 'Review' && existing.data.order_id && existing.data.order_item_id) {
    prisma.order.findUnique({ where: { id: existing.data.order_id } }).then((order) => {
      if (!order) return;
      const reviewedIds = (order.data.reviewed_item_ids || []).filter((id) => id !== existing.data.order_item_id);
      return prisma.order.update({
        where: { id: order.id },
        data: { data: { ...order.data, reviewed_item_ids: reviewedIds } },
      });
    }).then((updatedOrder) => {
      if (updatedOrder) emitEntityEvent('Order', 'update', serialize(updatedOrder));
    }).catch((err) => console.error('Failed to unlock order item after review delete:', err));
  }

  res.status(204).end();
});

module.exports = { router, serialize };
