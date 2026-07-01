const jwt = require('jsonwebtoken');
const { prisma } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' });
}

function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    phone: user.phone,
    region: user.region,
    city: user.city,
    specific_address: user.specificAddress,
    profile_complete: user.profileComplete,
    notification_permission: user.notificationPermission,
    is_verified: user.isVerified,
    created_date: user.createdAt.toISOString(),
    updated_date: user.updatedAt.toISOString(),
  };
}

// Populates req.user (raw Prisma User row) when a valid Bearer token is present.
// Does not reject the request — routes decide what's required.
async function attachUser(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

module.exports = { signToken, serializeUser, attachUser, requireAuth, requireAdmin, JWT_SECRET };
