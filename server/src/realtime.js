const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { prisma } = require('./db');
const { JWT_SECRET } = require('./auth');

let io = null;

function initRealtime(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.on('connection', async (socket) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return;
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return;
      socket.join(`user:${user.id}`);
      if (user.role === 'admin') socket.join('admins');
    } catch {
      // Unauthenticated sockets simply receive no events.
    }
  });

  return io;
}

// entityName: e.g. 'Notification' | 'Order' | 'UserNotification'
// type: 'create' | 'update' | 'delete'
// record: serialized record (with .id, .data-flattened fields, created_by_id, etc.)
function emitEntityEvent(entityName, type, record) {
  if (!io) return;
  const payload = { type, data: record };
  io.to('admins').emit(`entity:${entityName}`, payload);
  const targetUserId = record.user_id || record.created_by_id;
  if (targetUserId) io.to(`user:${targetUserId}`).emit(`entity:${entityName}`, payload);
}

module.exports = { initRealtime, emitEntityEvent };
