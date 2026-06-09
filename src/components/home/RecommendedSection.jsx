import React from 'react';
import { Sparkles } from 'lucide-react';
import ProductCard from '@/components/store/ProductCard';
import { computePersonalScore } from '@/lib/trendingScore';

/** Fisher-Yates shuffle within score tiers (within 10% of each tier's top score) */
function shuffleWithinTiers(sorted) {
  const result = [];
  let i = 0;
  while (i < sorted.length) {
    const tierMax = sorted[i]._personalScore;
    const threshold = tierMax * 0.9;
    let j = i + 1;
    while (j < sorted.length && sorted[j]._personalScore >= threshold) j++;
    const tier = sorted.slice(i, j);
    for (let k = tier.length - 1; k > 0; k--) {
      const m = Math.floor(Math.random() * (k + 1));
      [tier[k], tier[m]] = [tier[m], tier[k]];
    }
    result.push(...tier);
    i = j;
  }
  return result;
}

/** A profile is sparse if the user has almost no behavioral signal and hasn't seeded. */
function isSparseProfile(profile) {
  if (!profile) return true;
  const totals = [
    ...Object.values(profile.viewed_categories || {}),
    ...Object.values(profile.purchased_categories || {}),
    ...Object.values(profile.cart_categories || {}),
  ];
  return totals.reduce((a, b) => a + b, 0) < 3 && !profile.seeded;
}

export default function RecommendedSection({ products, userProfile, favorites, purchasedProductIds = [] }) {
  if (!products?.length) return null;

  const sparse = isSparseProfile(userProfile);

  const excluded = new Set(purchasedProductIds);
  const viewCount = {};
  (userProfile?.viewed_products || []).forEach(id => { viewCount[id] = (viewCount[id] || 0) + 1; });

  const eligible = products
    .filter(p => !excluded.has(p.id))
    .filter(p => (viewCount[p.id] || 0) < 8);

  if (!eligible.length) return null;

  let final;
  let discoveryIds = new Set();

  if (sparse) {
    // Cold-start: rank by trending score
    final = [...eligible]
      .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
      .slice(0, 10);
  } else {
    // Discovery slots: trending products outside all known categories
    const userCats = new Set([
      ...Object.keys(userProfile.purchased_categories || {}),
      ...Object.keys(userProfile.viewed_categories || {}),
      ...Object.keys(userProfile.cart_categories || {}),
    ]);
    const discovery = products
      .filter(p => !userCats.has(p.category) && (p.trendingScore || 0) > 5)
      .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
      .slice(0, 2);
    discoveryIds = new Set(discovery.map(p => p.id));

    // Score every eligible product
    const scored = eligible
      .map(p => ({
        ...p,
        _personalScore: computePersonalScore(p, userProfile, p.trendingScore || 0, products),
      }))
      .sort((a, b) => b._personalScore - a._personalScore);

    // Category diversity: break up a dominant category in the top 12
    const top = scored.slice(0, 12);
    const catCounts = {};
    top.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
    const dominantCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const dominantCount = catCounts[dominantCat] || 0;

    let diversified = top;
    if (dominantCount >= 8 && scored.length > 12) {
      const others = scored.slice(12).filter(p => p.category !== dominantCat);
      diversified = [...top.slice(0, 9), ...others.slice(0, 3)];
    }

    // Shuffle within score tiers for freshness
    const resorted = [...diversified].sort((a, b) => b._personalScore - a._personalScore);
    final = shuffleWithinTiers(resorted).slice(0, 10);
  }

  if (!final.length) return null;

  return (
    <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
          {sparse ? 'Trending Now' : 'Recommended For You'}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
        {final.map(p => (
          <ProductCard
            key={p.id}
            product={p}
            isFavorite={!!favorites[p.id]}
            favoriteId={favorites[p.id]}
            badge={sparse ? null : (discoveryIds.has(p.id)
              ? { label: '✨ You Might Like', color: 'text-accent border-accent/30 bg-accent/10' }
              : { label: '⭐ Picked For You', color: 'text-primary border-primary/30 bg-primary/10' }
            )}
          />
        ))}
      </div>
    </section>
  );
}