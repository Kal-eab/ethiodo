import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WEIGHTS = { purchase: 5, view: 1, wishlist: 2 };

function decayFactor(createdAt) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 1)  return 1.0;
  if (ageDays <= 7)  return 0.6;
  if (ageDays <= 14) return 0.25;
  return 0.1;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduled calls (no user) or admin calls
  let isAuthed = false;
  try {
    const user = await base44.auth.me();
    isAuthed = user?.role === 'admin';
  } catch { /* scheduled — allow */ }

  // Fetch all events (last 30 days)
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const events = await base44.asServiceRole.entities.ProductEvent.list('-created_date', 10000);
  const recentEvents = events.filter(e => e.created_date >= cutoff);

  // Group by product
  const byProduct = {};
  for (const ev of recentEvents) {
    if (!byProduct[ev.product_id]) byProduct[ev.product_id] = [];
    byProduct[ev.product_id].push(ev);
  }

  // Compute score per product
  const scores = {};
  for (const [productId, evList] of Object.entries(byProduct)) {
    let score = 0;
    let purchases = 0, views = 0, wishlists = 0;
    for (const ev of evList) {
      const w = WEIGHTS[ev.event_type] || 0;
      const d = decayFactor(ev.created_date);
      score += w * d;
      if (ev.event_type === 'purchase') purchases++;
      if (ev.event_type === 'view') views++;
      if (ev.event_type === 'wishlist') wishlists++;
    }
    scores[productId] = {
      trendingScore: Math.round(score * 100) / 100,
      totalPurchases: purchases,
      totalViews: views,
      totalWishlists: wishlists,
      lastScoreUpdatedAt: new Date().toISOString(),
    };
  }

  // Update products
  const products = await base44.asServiceRole.entities.Product.list(null, 1000);
  let updated = 0;
  for (const product of products) {
    const s = scores[product.id];
    if (s) {
      await base44.asServiceRole.entities.Product.update(product.id, s);
      updated++;
    } else if (!product.trendingScore) {
      await base44.asServiceRole.entities.Product.update(product.id, {
        trendingScore: 0, totalPurchases: 0, totalViews: 0, totalWishlists: 0,
        lastScoreUpdatedAt: new Date().toISOString(),
      });
    }
  }

  return Response.json({ success: true, updated, totalProducts: products.length });
});