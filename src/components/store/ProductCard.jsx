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
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(180,255,0,0.06)] hover:-translate-y-1">
        {/* Image — rectangular 4:3 */}
        <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            onError={(e) => { 
              const target = /** @type {HTMLImageElement} */ (e.currentTarget);
              target.src = '/placeholder.png'; 
            }}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
          {/* Gradient overlay with cart button */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <Button
                size="sm"
                className="w-full bg-primary text-primary-foreground font-mono text-[10px] h-8 hover:bg-primary/90 rounded-lg"
                onClick={handleBuy}
              >
                <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                BUY NOW
              </Button>
            </div>
          </div>
          {/* Favorite */}
          <button
            onClick={toggleFavorite}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-full border border-border/40 transition-colors hover:bg-background/90"
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-primary text-primary' : 'text-white'}`} />
          </button>
          {/* Category badge or custom badge */}
          <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-background/60 backdrop-blur-sm text-[9px] font-mono uppercase tracking-wider text-muted-foreground rounded">
            {product.category}
          </span>
        </div>

        {/* Info */}
        <div className="p-2.5 space-y-1">
          {badge && (
            <span className={`inline-block font-mono text-[9px] px-1.5 py-0.5 border rounded-sm ${badge.color}`}>
              {badge.label}
            </span>
          )}
          <h3 className="font-medium text-sm truncate leading-tight">{product.name}</h3>
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className="font-mono font-bold text-primary text-sm">
              {Number(product.price).toLocaleString('en-US', { maximumFractionDigits: 2 })} Birr
            </span>
            <div className="flex items-center gap-1.5">
              {product.stock > 0 && product.stock <= 5 && (
                <span className="font-mono text-[9px] text-orange-400">Only {product.stock} left</span>
              )}
              {(product.reviewCount > 0 || product.rating > 0) && (
                <div className="flex items-center gap-0.5 text-muted-foreground">
                  <Star className="w-2.5 h-2.5 fill-primary text-primary" />
                  <span className="font-mono text-[10px]">
                    {(product.reviewCount > 0 ? product.averageRating : product.rating)?.toFixed(1)}
                    {product.reviewCount > 0 && ` (${product.reviewCount})`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});

export default ProductCard;