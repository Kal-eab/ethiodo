const express = require('express');
const { prisma } = require('../db');
const { serializeUser, requireAdmin } = require('../auth');

const router = express.Router();

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

const ASSIGNABLE_ROLES = ['user', 'delivery', 'admin'];

// Mirrors base44.entities.User.list('-created_date', 500) — admin-only in the
// existing frontend (customer analytics, admin dashboards).
router.get('/', requireAdmin, async (req, res) => {
  const requested = req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT;
  const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, MAX_LIMIT) : DEFAULT_LIMIT;
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  res.json(users.map(serializeUser));
});

// Admin-only: promote/demote a user's role (e.g. 'user' -> 'delivery' for a
// courier, or back). Scoped to just `role` — profile fields stay self-service
// via PATCH /api/auth/me.
router.patch('/:id', requireAdmin, async (req, res) => {
  const { role } = req.body || {};
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}` });
  }
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
  res.json(serializeUser(user));
});

module.exports = router;
