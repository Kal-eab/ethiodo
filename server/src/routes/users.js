const express = require('express');
const { prisma } = require('../db');
const { serializeUser, requireAdmin } = require('../auth');

const router = express.Router();

// Mirrors base44.entities.User.list('-created_date', 500) — admin-only in the
// existing frontend (customer analytics, admin dashboards).
router.get('/', requireAdmin, async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  res.json(users.map(serializeUser));
});

module.exports = router;
