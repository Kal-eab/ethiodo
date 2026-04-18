import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ProductCard({ product, isFavorite, favoriteId }) {
  const queryClient = useQueryClient();
  const image = product.images?.[0] || '/placeholder.png';

  const addToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Optimistic update
    queryClient.setQueryData(['cart'], (old = []) => [
      ...old,
      { id: `temp-${Date.now()}`, product_id: product.id, quantity: 1 },
    ]);
    toast.success('Added to cart');
    await base44.entities.CartItem.create({ product_id: product.id, quantity: 1 });
    queryClient.invalidateQueries({ queryKey: ['cart'] });
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
      <div className="bg-card border border-border overflow-hidden transition-all duration-300 hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_15px_rgba(180,255,0,0.08)] hover:-translate-y-2 hover:scale-[1.02]">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-secondary">
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Overlay actions */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-primary text-primary-foreground font-mono text-xs h-10 hover:bg-primary/90"
                onClick={addToCart}
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                ADD
              </Button>
            </div>
          </div>
          {/* Favorite */}
          <button
            onClick={toggleFavorite}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-background/50 backdrop-blur-sm border border-border/50 transition-colors hover:bg-background/80"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-primary text-primary' : 'text-white'}`} />
          </button>
          {/* Category badge */}
          <span className="absolute top-3 left-3 px-2 py-1 bg-background/50 backdrop-blur-sm text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border/50">
            {product.category}
          </span>
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <h3 className="font-medium text-sm truncate">{product.name}</h3>
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-primary text-lg">
              ${product.price?.toFixed(2)}
            </span>
            {product.rating > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Star className="w-3 h-3 fill-primary text-primary" />
                <span className="font-mono text-xs">{product.rating?.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}