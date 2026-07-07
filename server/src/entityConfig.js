// Mirrors the RLS rules from base44/entities/*.jsonc so the migrated
// backend enforces the same access control the Base44 platform used to.
//
// Each rule is one of:
//   'public'        - anyone (including guests where noted) may perform the action
//   'admin'         - only role === 'admin'
//   'owner'         - only the record's createdById === req.user.id
//   'ownerOrAdmin'  - owner OR admin
//   { field, matchUserField } - record.data[field] === req.user[matchUserField], or admin
const rules = {
  CartItem: { create: 'owner', read: 'ownerOrAdmin', update: 'ownerOrAdmin', delete: 'ownerOrAdmin' },
  CategoryConfig: { create: 'admin', read: 'public', update: 'admin', delete: 'admin' },
  ContactRequest: { create: 'public', read: 'ownerOrAdmin', update: 'admin', delete: 'admin' },
  Creator: { create: 'admin', read: 'public', update: 'admin', delete: 'admin' },
  CreatorProductLink: { create: 'admin', read: 'public', update: 'admin', delete: 'admin' },
  CustomerReferral: {
    create: 'public',
    read: { field: 'customer_email', matchUserField: 'email' },
    update: 'admin',
    delete: 'admin',
  },
  // Only admin assigns deliveries; the assigned courier (or admin) can read/
  // update their own assignment (e.g. mark received + attach proof photo).
  DeliveryAssignment: {
    create: 'admin',
    read: { field: 'delivery_user_id', matchUserField: 'id' },
    update: { field: 'delivery_user_id', matchUserField: 'id' },
    delete: 'admin',
  },
  Favorite: { create: 'owner', read: 'owner', update: 'owner', delete: 'owner' },
  Message: {
    create: { field: 'user_email', matchUserField: 'email' },
    read: { field: 'user_email', matchUserField: 'email' },
    update: { field: 'user_email', matchUserField: 'email' },
    delete: { field: 'user_email', matchUserField: 'email' },
  },
  Notification: { create: 'public', read: 'admin', update: 'admin', delete: 'admin' },
  Order: { create: 'owner', read: 'ownerOrAdmin', update: 'admin', delete: 'admin' },
  Product: { create: 'admin', read: 'public', update: 'admin', delete: 'admin' },
  ProductEvent: { create: 'public', read: 'admin', update: 'admin', delete: 'admin' },
  ProductLike: { create: 'owner', read: 'public', update: 'owner', delete: 'owner' },
  ProductShare: { create: 'public', read: 'admin', update: 'admin', delete: 'admin' },
  ReferralLink: {
    create: 'owner',
    read: { field: 'owner_user_id', matchUserField: 'id' },
    update: 'admin',
    delete: 'admin',
  },
  Review: { create: 'public', read: 'public', update: 'admin', delete: 'admin' },
  UserBehavior: { create: 'owner', read: 'owner', update: 'owner', delete: 'admin' },
  UserNotification: {
    create: 'public',
    read: { field: 'user_id', matchUserField: 'id' },
    update: { field: 'user_id', matchUserField: 'id' },
    delete: 'admin',
  },
};

const entityNames = Object.keys(rules);

// Fields that only an admin may write. The generic entity CRUD route lets the
// client send an arbitrary `data` blob, so without this a non-admin could set
// server-authoritative fields directly — e.g. POST /api/entities/Review with
// { status: 'approved', verified_buyer: true } to inject a fake "verified"
// approved review (bypassing the purchase-verification in routes/reviews.js),
// or create an Order that is already marked paid/delivered. Admins keep full
// control; these are only stripped for non-admin writers.
const ADMIN_ONLY_FIELDS = {
  Review: ['status', 'verified_buyer', 'featured'],
  Order: [
    'money_received',
    'money_received_date',
    'profit_recorded',
    'confirmed_date',
    'shipped_date',
    'delivered_date',
    'reviewed_item_ids',
  ],
};

// Values forced onto a non-admin *create* regardless of what the client sends,
// so new records always start in a safe, unprivileged state.
const FORCED_CREATE_DEFAULTS = {
  Review: { status: 'pending', verified_buyer: false, featured: false },
  Order: { status: 'pending' },
};

// Strips admin-only fields (and, on create, forces safe defaults) from a
// client-supplied data blob when the writer is not an admin.
function sanitizeWrite(entity, data, user, action) {
  if (isAdmin(user)) return data;
  const out = { ...(data || {}) };
  for (const field of ADMIN_ONLY_FIELDS[entity] || []) delete out[field];
  if (action === 'create') Object.assign(out, FORCED_CREATE_DEFAULTS[entity] || {});
  return out;
}

function isAdmin(user) {
  return !!user && user.role === 'admin';
}

function canCreate(entity, user) {
  const rule = rules[entity].create;
  if (rule === 'public') return true;
  if (rule === 'admin') return isAdmin(user);
  if (rule === 'owner') return !!user;
  if (typeof rule === 'object') return !!user;
  return false;
}

// Returns true if the given record (already-loaded, with `.data`) is visible/editable
// to `user` under `rule`. `action` is 'read' | 'update' | 'delete'.
function checkRecord(entity, action, record, user) {
  const rule = rules[entity][action];
  if (rule === 'public') return true;
  if (rule === 'admin') return isAdmin(user);
  if (rule === 'owner') return !!user && record.createdById === user.id;
  if (rule === 'ownerOrAdmin') return isAdmin(user) || (!!user && record.createdById === user.id);
  if (typeof rule === 'object') {
    if (isAdmin(user)) return true;
    if (!user) return false;
    return record.data?.[rule.field] === user[rule.matchUserField];
  }
  return false;
}

// For list/filter — when the rule can be pushed down to a WHERE clause, return
// Prisma filter object to append (AND); otherwise return null and the caller
// must post-filter with checkRecord.
function readWhereClause(entity, user) {
  const rule = rules[entity].read;
  if (rule === 'public') return {};
  if (rule === 'admin') return isAdmin(user) ? {} : { id: '__none__' };
  if (rule === 'owner') return isAdmin(user) ? {} : { createdById: user?.id || '__none__' };
  if (rule === 'ownerOrAdmin') return isAdmin(user) ? {} : { createdById: user?.id || '__none__' };
  if (typeof rule === 'object') {
    if (isAdmin(user)) return {};
    if (!user) return { id: '__none__' };
    return { data: { path: [rule.field], equals: user[rule.matchUserField] } };
  }
  return { id: '__none__' };
}

module.exports = { rules, entityNames, isAdmin, canCreate, checkRecord, readWhereClause, sanitizeWrite };
