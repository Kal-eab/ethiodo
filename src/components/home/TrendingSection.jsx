import React from 'react';
import { Flame } from 'lucide-react';
import ProductCard from '@/components/store/ProductCard';

export default function TrendingSection({ products, favorites }) {
  if (!products?.length) return null;

  // Determine badge thresholds
  const scores = products.map(p => p.trendingScore || 0);
  const maxScore = Math.max(...scores, 1);
  const hotThreshold = maxScore * 0.8;
  const popularThreshold = maxScore * 0.5;

  const getBadge = (p) => {
    const s = p.trendingScore || 0;
    if (s >= hotThreshold) return { label: '🔥 Hot', color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' };
    if (s >= popularThreshold) return { label: '📈 Popular', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' };
    return null;
  };

  return (
    <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-4 h-4 text-orange-400" />
        <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Trending Now</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
        {products.map(p => (
          <ProductCard
            key={p.id}
            product={p}
            isFavorite={!!favorites[p.id]}
            favoriteId={favorites[p.id]}
            badge={getBadge(p)}
          />
        ))}
      </div>
    </section>
  );
}