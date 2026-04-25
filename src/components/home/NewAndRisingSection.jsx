import React from 'react';
import { Zap } from 'lucide-react';
import ProductCard from '@/components/store/ProductCard';

export default function NewAndRisingSection({ products, favorites }) {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const newRising = products
    .filter(p => p.created_date >= fourteenDaysAgo && (p.trendingScore || 0) > 0)
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
    .slice(0, 6);

  if (!newRising.length) return null;

  return (
    <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-accent" />
        <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">New & Rising</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
        {newRising.map(p => (
          <ProductCard
            key={p.id}
            product={p}
            isFavorite={!!favorites[p.id]}
            favoriteId={favorites[p.id]}
            badge={{ label: '🆕 New', color: 'text-accent border-accent/30 bg-accent/10' }}
          />
        ))}
      </div>
    </section>
  );
}