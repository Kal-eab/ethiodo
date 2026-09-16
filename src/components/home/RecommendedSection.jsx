import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import ProductShowcase from '@/components/home/ProductShowcase';
import { computePersonalScore } from '@/lib/trendingScore';

// One seed per page visit. The shuffle below must give the same order every
// time it runs with the same inputs: it re-runs whenever a query resolves (the
// user profile arriving a moment after products, say), and a fresh random order
// each time made products jump around under the user — in the touch carousel
// the browser even followed the moved card, sliding the row sideways on load.
// A new visit still gets a new seed, so the feed stays fresh between visits.
const VISIT_SEED = Math.floor(Math.random() * 2 ** 32);

/** Small seeded PRNG (mulberry32) — deterministic for a given seed. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle within score tiers (~10% band each) */
function shuffleWithinTiers(scoredProducts) {
  const random = seededRandom(VISIT_SEED);
  if (!scoredProducts.length) return scoredProducts;
  const maxScore = scoredProducts[0]._personalScore;
  const tierSize = maxScore > 0 ? maxScore * 0.1 : 1;

  const tiers = [];
  let currentTier = [];
  let tierFloor = maxScore;

  for (const p of scoredProducts) {
    if (tierFloor - p._personalScore <= tierSize) {
      currentTier.push(p);
    } else {
      tiers.push(currentTier);
      currentTier = [p];
      tierFloor = p._personalScore;
    }
  }
  if (currentTier.length) tiers.push(currentTier);

  for (const tier of tiers) {
    for (let i = tier.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [tier[i], tier[j]] = [tier[j], tier[i]];
    }
  }

  return tiers.flat();
}

/** Check if profile has enough signal for personalized scoring */
function hasEnoughSignal(profile) {
  if (!profile) return false;
  return (
    Object.keys(profile.viewed_categories || {}).length > 0 ||
    Object.keys(profile.purchased_categories || {}).length > 0 ||
    Object.keys(profile.cart_categories || {}).length > 0 ||
    profile.seeded === true
  );
}

export default function RecommendedSection({ products, userProfile, favorites, purchasedProductIds = [] }) {
  // Memoized so the list only reshuffles when the inputs really change. It
  // shuffles with Math.random(), so recomputing on every render (e.g. after
  // toggling a favorite) reordered products under the user — in the scroll-
  // driven showcase that would swap the product they are looking at.
  const recommendation = useMemo(() => {
    if (!products?.length) return null;

    const isPersonalized = hasEnoughSignal(userProfile);

    const excluded = new Set(purchasedProductIds);
    const viewed = userProfile?.viewed_products || [];
    const viewCount = {};
    viewed.forEach(id => { viewCount[id] = (viewCount[id] || 0) + 1; });

    const candidates = products
      .filter(p => !excluded.has(p.id))
      .filter(p => (viewCount[p.id] || 0) < 8);

    // Score products: personalized or trending fallback
    const scored = candidates
      .map(p => ({
        ...p,
        _personalScore: isPersonalized
          ? computePersonalScore(p, userProfile, p.trendingScore || 0, products)
          : (p.trendingScore || 0),
      }))
      .sort((a, b) => b._personalScore - a._personalScore);

    // Shuffle within tiers for feed freshness
    const shuffled = shuffleWithinTiers(scored);

    // Diversity: if top 10 are all same category, inject variety
    const top = shuffled.slice(0, 12);
    const cats = top.map(p => p.category);
    const dominantCat = cats.length
      ? cats.sort((a, b) => cats.filter(c => c === b).length - cats.filter(c => c === a).length)[0]
      : null;
    const dominantCount = cats.filter(c => c === dominantCat).length;

    let diversified = top;
    if (dominantCount >= 8 && shuffled.length > 12) {
      const others = shuffled.slice(12).filter(p => p.category !== dominantCat);
      diversified = [...top.slice(0, 9), ...others.slice(0, 3)];
    }

    // Reserve 1-2 slots for discovery (trending in unseen categories)
    const userCats = new Set([
      ...Object.keys(userProfile?.purchased_categories || {}),
      ...Object.keys(userProfile?.viewed_categories || {}),
      ...Object.keys(userProfile?.cart_categories || {}),
    ]);
    const discoveryIds = new Set(
      products
        .filter(p => !userCats.has(p.category) && (p.trendingScore || 0) > 5)
        .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
        .slice(0, 2)
        .map(p => p.id)
    );

    return { isPersonalized, final: diversified.slice(0, 10), discoveryIds };
  }, [products, userProfile, purchasedProductIds]);

  if (!recommendation?.final.length) return null;
  const { isPersonalized, final, discoveryIds } = recommendation;

  return (
    <ProductShowcase
      products={final}
      favorites={favorites}
      title={isPersonalized ? 'Recommended For You' : 'Trending Now'}
      icon={<Sparkles className="w-4 h-4 text-primary" />}
      getBadge={(p) => (discoveryIds.has(p.id)
        ? { label: '✨ You Might Like', color: 'text-accent border-accent/30 bg-accent/10' }
        : { label: '⭐ Picked For You', color: 'text-primary border-primary/30 bg-primary/10' })}
    />
  );
}
