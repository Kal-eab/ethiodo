import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Heart, ShoppingCart, Star, Minus, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Navbar from '@/components/store/Navbar';

export default function ProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/');
  const productId = pathParts[pathParts.length - 1];
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const items = await base44.entities.Product.filter({ id: productId });
      return items[0];
    },
    enabled: !!productId,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => base44.entities.Favorite.list(),
  });

  const fav = favorites.find(f => f.product_id === productId);

  const addToCart = async () => {
    await base44.entities.CartItem.create({
      product_id: productId,
      quantity,
    });
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    toast.success('Added to cart');
  };

  const buyNow = async () => {
    await base44.entities.CartItem.create({
      product_id: productId,
      quantity,
    });
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    navigate('/cart');
  };

  const toggleFav = async () => {
    if (fav) {
      await base44.entities.Favorite.delete(fav.id);
    } else {
      await base44.entities.Favorite.create({ product_id: productId });
    }
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-16 flex flex-col items-center justify-center min-h-[60vh]">
          <p className="font-mono text-muted-foreground">PRODUCT NOT FOUND</p>
          <Link to="/" className="text-primary font-mono text-sm mt-4">← BACK TO SHOP</Link>
        </div>
      </div>
    );
  }

  const images = product.images?.length > 0 ? product.images : ['/placeholder.png'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground text-sm font-mono mb-8 hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            BACK
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Images - 60% */}
            <div className="lg:col-span-3 space-y-3">
              <div className="aspect-square bg-secondary border border-border overflow-hidden">
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-20 h-20 flex-shrink-0 border overflow-hidden ${
                        selectedImage === i ? 'border-primary' : 'border-border'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details - sticky */}
            <div className="lg:col-span-2 lg:sticky lg:top-24 lg:self-start space-y-6">
              <div>
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-[0.2em]">
                  {product.category}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold mt-2">{product.name}</h1>
                {product.rating > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < Math.round(product.rating) ? 'fill-primary text-primary' : 'text-border'}`}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">
                      {product.rating?.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-b border-border py-6">
                <span className="font-mono text-3xl font-bold text-primary">
                  ${product.price?.toFixed(2)}
                </span>
                {product.stock > 0 && (
                  <p className="font-mono text-xs text-accent mt-2">
                    IN STOCK — {product.stock} available
                  </p>
                )}
              </div>

              {product.description && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-muted-foreground uppercase">Qty</span>
                <div className="flex items-center border border-border">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-mono">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={buyNow}
                  className="w-full h-12 bg-primary text-primary-foreground font-mono font-bold tracking-wider hover:bg-primary/90"
                >
                  BUY NOW — ${(product.price * quantity).toFixed(2)}
                </Button>
                <div className="flex gap-3">
                  <Button
                    onClick={addToCart}
                    variant="outline"
                    className="flex-1 h-12 font-mono text-sm border-border hover:border-foreground"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    ADD TO CART
                  </Button>
                  <Button
                    onClick={toggleFav}
                    variant="outline"
                    size="icon"
                    className={`h-12 w-12 border-border hover:border-foreground ${fav ? 'text-primary border-primary' : ''}`}
                  >
                    <Heart className={`w-4 h-4 ${fav ? 'fill-primary' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}