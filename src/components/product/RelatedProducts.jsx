import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProductCard from '@/components/store/ProductCard';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getParentCategory, getMatchingCategoryValues } from '@/lib/categories';

export default function RelatedProducts({ product, favorites = {} }) {
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ published: true }, '-created_date', 200),
  });

  // Related = other products in the same top-level group (a subcategory falls back to
  // its parent so siblings show too). Case-insensitive, shared with the store filter.
  const group = getParentCategory(product.category) || product.category;
  const matchSet = getMatchingCategoryValues(group);
  const related = products
    .filter(p => p.id !== product.id && (!matchSet || matchSet.has(String(p.category || '').toLowerCase())))
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Related Products</h2>
        <Link to="/" className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
          View All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {related.map(p => (
          <ProductCard
            key={p.id}
            product={p}
            isFavorite={!!favorites[p.id]}
            favoriteId={favorites[p.id]}
          />
        ))}
      </div>
    </div>
  );
}