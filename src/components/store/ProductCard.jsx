import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Star, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function ProductCard({ product, isFavorite, favoriteId }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const image = product.images?.[0] || '/placeholder.png';

  const handleBuy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(`/payment?product=${product.id}&qty=1`);
      return;
    }
    navigate(`/payment?product=${product.id}&qty=1`);
  };

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Optimistic update
    if (isFavorite && favoriteId) {
      queryClient.setQueryData(['favorites'], (old = []) => old.filter(f => f.id !== favoriteId));
      await base44.entities.Favorite.delete(favoriteId);
    } else {
      const tempId = `temp-${Date.now()}`;
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
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Gradient overlay with cart button */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
          {/* Category badge */}
          <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-background/60 backdrop-blur-sm text-[9px] font-mono uppercase tracking-wider text-muted-foreground rounded">
            {product.category}
          </span>
        </div>

        {/* Info */}
        <div className="p-2.5 space-y-1">
          <h3 className="font-medium text-xs truncate leading-tight">{product.name}</h3>
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-primary text-sm">
              ${product.price?.toFixed(2)}
            </span>
            {product.rating > 0 && (
              <div className="flex items-center gap-0.5 text-muted-foreground">
                <Star className="w-2.5 h-2.5 fill-primary text-primary" />
                <span className="font-mono text-[10px]">{product.rating?.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}