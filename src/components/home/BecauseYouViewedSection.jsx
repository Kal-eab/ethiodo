import React from 'react';
import { Eye } from 'lucide-react';
import ProductCard from '@/components/store/ProductCard';

export default function BecauseYouViewedSection({ products, viewedProductIds, favorites }) {
  if (!viewedProductIds?.length || !products?.length) return null;

  // Last viewed product
  const lastViewedId = viewedProductIds[0];
  const lastViewed = products.find(p => p.id === lastViewedId);
  if (!lastViewed) return null;

  const lastTags = (lastViewed.tags || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);

  const related = products
    .filter(p => p.id !== lastViewedId)
    .map(p => {
      const pTags = (p.tags || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
      const tagOverlap = lastTags.filter(t => pTags.includes(t)).length;
      const sameCategory = p.category === lastViewed.category ? 1 : 0;
      const priceSimilar = Math.abs(p.price - lastViewed.price) / (lastViewed.price || 1) < 0.5 ? 1 : 0;
      const score = tagOverlap * 2 + sameCategory + priceSimilar;
      return { ...p, _score: score };
    })
    .filter(p => p._score >= 2)
    .sort((a, b) => b._score - a._score)
    .slice(0, 8);

  if (!related.length) return null;

  const shortName = lastViewed.name?.length > 25 ? lastViewed.name.slice(0, 25) + '…' : lastViewed.name;

  return (
    <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
          Because You Viewed <span className="text-foreground">{shortName}</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
        {related.map(p => (
          <ProductCard
            key={p.id}
            product={p}
            isFavorite={!!favorites[p.id]}
            favoriteId={favorites[p.id]}
          />
        ))}
      </div>
    </section>
  );
}