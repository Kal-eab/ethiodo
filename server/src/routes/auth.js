const express = require('express');
const bcrypt = require('bcryptjs');
const { prisma } = require('../db');
const { signToken, serializeUser, requireAuth } = require('../auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, full_name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash, fullName: full_name || null },
  });
  const token = signToken(user.id);
  res.status(201).json({ token, user: serializeUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
  const token = signToken(user.id);
  res.json({ token, user: serializeUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(serializeUser(req.user));
});

router.patch('/me', requireAuth, async (req, res) => {
  const allowed = [
    'full_name',
    'phone',
    'region',
    'city',
    'specific_address',
    'profile_complete',
    'notification_permission',
  ];
  const fieldMap = {
    full_name: 'fullName',
    phone: 'phone',
    region: 'region',
    city: 'city',
    specific_address: 'specificAddress',
    profile_complete: 'profileComplete',
    notification_permission: 'notificationPermission',
  };
  const data = {};
  for (const key of allowed) {
    if (key in (req.body || {})) data[fieldMap[key]] = req.body[key];
  }
  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  res.json(serializeUser(user));
});

module.exports = router;
