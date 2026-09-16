import React from 'react';
import { Sparkles } from 'lucide-react';
import ProductCard from '@/components/store/ProductCard';
import { computePersonalScore } from '@/lib/trendingScore';

/** Fisher-Yates shuffle within score tiers (~10% band each) */
function shuffleWithinTiers(scoredProducts) {
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
      const j = Math.floor(Math.random() * (i + 1));
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
  const discovery = products
    .filter(p => !userCats.has(p.category) && (p.trendingScore || 0) > 5)
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
    .slice(0, 2);

  const final = diversified.slice(0, 10);
  if (!final.length) return null;

  return (
    <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
          {isPersonalized ? 'Recommended For You' : 'Trending Now'}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
        {final.map(p => {
          const isDiscovery = discovery.find(d => d.id === p.id);
          return (
            <ProductCard
              key={p.id}
              product={p}
              isFavorite={!!favorites[p.id]}
              favoriteId={favorites[p.id]}
              badge={isDiscovery
                ? { label: '✨ You Might Like', color: 'text-accent border-accent/30 bg-accent/10' }
                : { label: '⭐ Picked For You', color: 'text-primary border-primary/30 bg-primary/10' }}
            />
          );
        })}
      </div>
    </section>
  );
}