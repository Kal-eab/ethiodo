/**
 * Client-side behavior tracking utility.
 * Logs view/wishlist/purchase/search/cart events, deduplicates per 24h window, and
 * maintains a session-storage profile for guest users.
 */

import { base44 } from '@/api/base44Client';

// ─── Session helpers ──────────────────────────────────────────────────────────

function getSessionId() {
  let id = sessionStorage.getItem('_sid');
  if (!id) { id = Math.random().toString(36).slice(2); sessionStorage.setItem('_sid', id); }
  return id;
}

/** Guest recently-viewed (session storage) */
export function getGuestRecentlyViewed() {
  try { return JSON.parse(sessionStorage.getItem('_rv') || '[]'); } catch { return []; }
}

function pushGuestRecentlyViewed(productId) {
  const rv = getGuestRecentlyViewed().filter(id => id !== productId);
  rv.unshift(productId);
  sessionStorage.setItem('_rv', JSON.stringify(rv.slice(0, 20)));
}

/** Dedup key: one view per product per session per 24h */
function canTrackView(productId) {
  const key = `_vt_${productId}`;
  const last = parseInt(sessionStorage.getItem(key) || '0', 10);
  const now = Date.now();
  if (now - last < 24 * 60 * 60 * 1000) return false;
  sessionStorage.setItem(key, String(now));
  return true;
}

// ─── Bot detection ────────────────────────────────────────────────────────────

function isBotLike(productId) {
  const key = `_vr_${productId}`;
  const raw = sessionStorage.getItem(key);
  const record = raw ? JSON.parse(raw) : { count: 0, first: Date.now() };
  record.count += 1;
  sessionStorage.setItem(key, JSON.stringify(record));
  const elapsed = Date.now() - record.first;
  return record.count >= 10 && elapsed < 5 * 60 * 1000;
}

// ─── Price sample helper (bug fix: guard empty array) ─────────────────────────

function updatePrices(profile, newPrice) {
  const prices = [...(profile._price_samples || []), newPrice].slice(-30);
  if (!prices.length) return {};
  return {
    _price_samples: prices,
    price_min: Math.min(...prices),
    price_max: Math.max(...prices),
    price_avg: prices.reduce((a, b) => a + b, 0) / prices.length,
  };
}

// ─── Track a product view ─────────────────────────────────────────────────────

export async function trackView(product, user) {
  pushGuestRecentlyViewed(product.id);

  if (!canTrackView(product.id)) return;
  if (isBotLike(product.id)) return;

  base44.entities.ProductEvent.create({
    product_id: product.id,
    event_type: 'view',
    user_email: user?.email || null,
    session_id: getSessionId(),
  }).catch(() => {});

  if (user?.email) {
    updateUserBehavior(user.email, profile => {
      const viewed = [product.id, ...(profile.viewed_products || []).filter(id => id !== product.id)].slice(0, 50);
      const viewedCats = { ...(profile.viewed_categories || {}) };
      viewedCats[product.category] = (viewedCats[product.category] || 0) + 1;
      return {
        viewed_products: viewed,
        viewed_categories: viewedCats,
        last_active_at: new Date().toISOString(),
        ...updatePrices(profile, product.price),
      };
    });
  }
}

// ─── Track a wishlist save ────────────────────────────────────────────────────

export async function trackWishlist(productId, user) {
  base44.entities.ProductEvent.create({
    product_id: productId,
    event_type: 'wishlist',
    user_email: user?.email || null,
    session_id: getSessionId(),
  }).catch(() => {});

  if (user?.email) {
    updateUserBehavior(user.email, profile => {
      const wl = [...new Set([...(profile.wishlist_product_ids || []), productId])];
      return { wishlist_product_ids: wl };
    });
  }
}

// ─── Track a purchase ─────────────────────────────────────────────────────────

export async function trackPurchase(product, user) {
  base44.entities.ProductEvent.create({
    product_id: product.id,
    event_type: 'purchase',
    user_email: user?.email || null,
    session_id: getSessionId(),
  }).catch(() => {});

  if (user?.email) {
    updateUserBehavior(user.email, profile => {
      const cats = { ...(profile.purchased_categories || {}) };
      cats[product.category] = (cats[product.category] || 0) + 1;
      return { purchased_categories: cats };
    });
  }
}

// ─── Track a search query ─────────────────────────────────────────────────────

export async function trackSearch(query, user) {
  if (!query || !query.trim()) return;
  const q = query.trim().toLowerCase();

  base44.entities.ProductEvent.create({
    product_id: 'search',
    event_type: 'search',
    user_email: user?.email || null,
    session_id: getSessionId(),
    query: q,
  }).catch(() => {});

  if (user?.email) {
    updateUserBehavior(user.email, profile => {
      const terms = [q, ...(profile.search_terms || []).filter(t => t !== q)].slice(0, 20);
      return { search_terms: terms };
    });
  }
}

// ─── Track add to cart ────────────────────────────────────────────────────────

export async function trackAddToCart(product, user) {
  if (!product?.id) return;

  base44.entities.ProductEvent.create({
    product_id: product.id,
    event_type: 'cart',
    user_email: user?.email || null,
    session_id: getSessionId(),
  }).catch(() => {});

  if (user?.email) {
    updateUserBehavior(user.email, profile => {
      const cats = { ...(profile.cart_categories || {}) };
      cats[product.category] = (cats[product.category] || 0) + 1;
      return {
        cart_categories: cats,
        ...updatePrices(profile, product.price),
      };
    });
  }
}

// ─── Merge guest history into user profile on login ───────────────────────────

export async function mergeGuestProfile(user) {
  if (!user?.email) return;
  if (sessionStorage.getItem('_merged')) return; // only once per session
  sessionStorage.setItem('_merged', '1');

  const guestIds = getGuestRecentlyViewed();
  if (!guestIds.length) return;
  sessionStorage.removeItem('_rv');

  updateUserBehavior(user.email, profile => {
    const existing = profile.viewed_products || [];
    const merged = [...new Set([...guestIds, ...existing])].slice(0, 50);
    return { viewed_products: merged };
  });
}

// ─── Decay stale profile interest counts (at most once per day) ───────────────

export async function decayProfile(user) {
  if (!user?.email) return;

  const existing = await base44.entities.UserBehavior.filter({ user_email: user.email }, null, 1);
  const profile = existing[0];
  if (!profile) return;

  if (profile.last_decayed_at) {
    const lastDecay = new Date(profile.last_decayed_at).getTime();
    if (Date.now() - lastDecay < 24 * 60 * 60 * 1000) return;
  }

  const decayCounts = (obj) => {
    if (!obj) return {};
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      const d = v * 0.9;
      if (d >= 0.5) result[k] = d;
    }
    return result;
  };

  base44.entities.UserBehavior.update(profile.id, {
    viewed_categories: decayCounts(profile.viewed_categories),
    purchased_categories: decayCounts(profile.purchased_categories),
    cart_categories: decayCounts(profile.cart_categories),
    last_decayed_at: new Date().toISOString(),
  }).catch(() => {});
}

// ─── Upsert user behavior profile ────────────────────────────────────────────

async function updateUserBehavior(userEmail, updater) {
  const existing = await base44.entities.UserBehavior.filter({ user_email: userEmail }, null, 1);
  const profile = existing[0] || {};
  const updates = updater(profile);
  if (profile.id) {
    base44.entities.UserBehavior.update(profile.id, updates).catch(() => {});
  } else {
    base44.entities.UserBehavior.create({ user_email: userEmail, ...updates }).catch(() => {});
  }
}