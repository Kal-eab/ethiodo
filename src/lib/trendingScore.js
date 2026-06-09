/**
 * Trending score computation with time-decay.
 * trendingScore = (Purchases×5) + (Wishlists×2) + (Cart×3) + (Views×1)
 * with time-decay buckets applied.
 */

const WEIGHTS = { purchase: 5, wishlist: 2, cart: 3, view: 1 };

function decayFactor(createdAt) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 1)  return 1.0;
  if (ageDays <= 7)  return 0.6;
  if (ageDays <= 14) return 0.25;
  return 0.1;
}

export function computeTrendingScore(events) {
  let score = 0;
  for (const ev of events) {
    const w = WEIGHTS[ev.event_type] || 0;
    const d = decayFactor(ev.created_date);
    score += w * d;
  }
  return Math.round(score * 100) / 100;
}

/** Personal score for a single product given user behavior profile */
export function computePersonalScore(product, profile, trendingScore, allProducts) {
  if (!profile) return trendingScore * 1.5;

  // categoryMatch — purchased > cart > viewed, no double-counting
  const purchasedCats = profile.purchased_categories || {};
  const cartCats      = profile.cart_categories || {};
  const viewedCats    = profile.viewed_categories || {};

  const topPurchased = Object.entries(purchasedCats).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topCart      = Object.entries(cartCats).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topViewed    = Object.entries(viewedCats).sort((a, b) => b[1] - a[1])[0]?.[0];

  let catScore = 0;
  if (product.category === topPurchased) catScore = 10;
  else if (product.category === topCart) catScore = 8;
  else if (product.category === topViewed) catScore = 6;
  else if (purchasedCats[product.category] || cartCats[product.category] || viewedCats[product.category]) catScore = 3;

  // Tag similarity to recently viewed products
  const viewedIds  = new Set(profile.viewed_products || []);
  const productTags = (product.tags || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
  const viewedTagOverlap = allProducts
    .filter(p => viewedIds.has(p.id))
    .slice(0, 20)
    .reduce((acc, vp) => {
      const vpTags = (vp.tags || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
      return acc + productTags.filter(t => vpTags.includes(t)).length;
    }, 0);
  const similarityScore = Math.min(viewedTagOverlap, 10);

  // priceMatch
  const avgSpend = profile.price_avg || 0;
  let priceScore = 5; // neutral default
  if (avgSpend > 0) {
    const diff = Math.abs(product.price - avgSpend) / avgSpend;
    priceScore = diff <= 0.3 ? 10 : diff <= 0.7 ? 5 : 0;
  }

  // newProductBoost — created within last 7 days
  const ageDays = (Date.now() - new Date(product.created_date).getTime()) / (1000 * 60 * 60 * 24);
  const newBoost = ageDays <= 7 ? 5 : 0;

  // Search terms boost — +4 if any recent search appears in name/tags
  const searchTerms = profile.search_terms || [];
  const productText = `${product.name} ${product.tags || ''}`.toLowerCase();
  const searchBoost = searchTerms.some(term => productText.includes(term)) ? 4 : 0;

  return (catScore * 4) + (similarityScore * 3) + (priceScore * 2) + (trendingScore * 1.5) + newBoost + searchBoost;
}