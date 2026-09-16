import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Star, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

// Memoized — rendered in grids of up to 200; without memo every keystroke in
// the Home search box re-renders every card even though its props are unchanged.
const ProductCard = React.memo(
  /** @param {{ product: any, isFavorite?: boolean, favoriteId?: any, badge?: { label: string, color: string } | null }} props */
  function ProductCard({ product, isFavorite, favoriteId, badge = null }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const image = product.images?.[0] || '/placeholder.png';

  const handleBuy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/product/${product.id}`);
  };

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Optimistic update
    if (isFavorite && favoriteId) {
      // @ts-ignore
      queryClient.setQueryData(['favorites'], (old = []) => old.filter(f => f.id !== favoriteId));
      await base44.entities.Favorite.delete(favoriteId);
    } else {
      const tempId = `temp-${Date.now()}`;
      // @ts-ignore
      queryClient.setQueryData(['favorites'], (old = []) => [
        ...old,
        { id: tempId, product_id: product.id },
      ]);
      await base44.entities.Favorite.create({ product_id: product.id });
    }
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
  };

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-300 hover:border-white/15 hover:-translate-y-1 hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.9)]">
        {/* Image — rectangular 4:3 */}
        <div className="relative aspect-[4/3] overflow-hidden bg-background">
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              const target = /** @type {HTMLImageElement} */ (e.currentTarget);
              target.src = '/placeholder.png';
            }}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {/* Quick action — calm glass pill, slides up on hover (desktop) */}
          <div className="absolute inset-x-2 bottom-2 opacity-0 translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-200">
            <Button
              size="sm"
              className="w-full h-9 rounded-lg bg-background/85 backdrop-blur-md border border-white/15 text-primary font-mono text-[11px] font-semibold hover:bg-background/95"
              onClick={handleBuy}
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
              BUY NOW
            </Button>
          </div>
          {/* Favorite */}
          <button
            onClick={toggleFavorite}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-background/55 backdrop-blur-sm rounded-full border border-border transition-colors hover:border-white/25"
          >
            <Heart className={`w-3.5 h-3.5 transition-transform ${isFavorite ? 'fill-primary text-primary scale-110' : 'text-white/70'}`} />
          </button>
          {/* Category badge */}
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-background/55 backdrop-blur-sm text-[9px] font-mono uppercase tracking-wider text-muted-foreground rounded">
            {product.category}
          </span>
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col gap-1.5">
          {badge && (
            <span className={`inline-block self-start font-mono text-[9px] px-1.5 py-0.5 border rounded ${badge.color}`}>
              {badge.label}
            </span>
          )}
          <h3 className="font-medium text-sm leading-snug line-clamp-2 min-h-[2.5em]">{product.name}</h3>
          {(product.reviewCount > 0 || product.rating > 0) && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Star className="w-3 h-3 fill-primary text-primary" />
              <span className="font-mono text-[11px]">
                {(product.reviewCount > 0 ? product.averageRating : product.rating)?.toFixed(1)}
                {product.reviewCount > 0 && ` (${product.reviewCount})`}
              </span>
            </div>
          )}
          <div className="mt-auto pt-1 flex items-baseline justify-between gap-2">
            <span className="font-mono font-semibold text-primary text-[15px]">
              {Number(product.price).toLocaleString('en-US', { maximumFractionDigits: 2 })} Birr
            </span>
            {product.stock > 0 && product.stock <= 5 && (
              <span className="font-mono text-[9px] text-orange-400 whitespace-nowrap">Only {product.stock} left</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});

export default ProductCard;