import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Heart, Star, Minus, Plus, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import ReviewSection from '@/components/product/ReviewSection';
import RelatedProducts from '@/components/product/RelatedProducts';
import Footer from '@/components/store/Footer';

export default function ProductDetail() {
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

  const { data: userOrders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 50),
  });

  const fav = favorites.find(f => f.product_id === productId);
  const favMap = {};
  favorites.forEach(f => { favMap[f.product_id] = f.id; });

  const handleBuyNow = async () => {
    // Require login before buying
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    navigate(`/payment?product=${productId}&qty=${quantity}`);
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
      <MobileHeader title={product?.name || 'Product'} />
      <Navbar />
      {/* Mobile: extra bottom padding so content isn't hidden behind sticky bar */}
      <main className="pt-16 md:pb-0 pb-28">
        <div className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/" className="hidden md:inline-flex items-center gap-2 text-muted-foreground text-sm font-mono mb-8 hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            BACK
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Images */}
            <div className="lg:col-span-3 space-y-3">
              <div className="aspect-square bg-secondary border border-border overflow-hidden">
                <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-20 h-20 flex-shrink-0 border overflow-hidden ${selectedImage === i ? 'border-primary' : 'border-border'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="lg:col-span-2 lg:sticky lg:top-24 lg:self-start space-y-6">
              <div>
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-[0.2em]">{product.category}</span>
                <h1 className="text-2xl sm:text-3xl font-bold mt-2">{product.name}</h1>
                {product.rating > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < Math.round(product.rating) ? 'fill-primary text-primary' : 'text-border'}`} />
                      ))}
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">{product.rating?.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-b border-border py-6">
                <span className="font-mono text-3xl font-bold text-primary">${product.price?.toFixed(2)}</span>
                {product.stock > 0 && (
                  <p className="font-mono text-xs text-accent mt-2">IN STOCK — {product.stock} available</p>
                )}
              </div>

              {product.description && (
                <div className="space-y-2">
                  <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Description</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Trust signals */}
              <div className="space-y-2 pt-2">
                {[
                  { icon: ShieldCheck, text: 'Secure payment — verified orders' },
                  { icon: Truck, text: 'Fast tracked delivery' },
                  { icon: RotateCcw, text: '14-day returns policy' },
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <div key={t.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                      {t.text}
                    </div>
                  );
                })}
              </div>

              {/* Quantity — always visible on desktop; hidden on mobile (in sticky bar instead) */}
              <div className="hidden md:flex items-center gap-4">
                <span className="font-mono text-xs text-muted-foreground uppercase">Qty</span>
                <div className="flex items-center border border-border">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-mono">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Desktop Actions */}
              <div className="hidden md:block space-y-3">
                <Button
                  onClick={handleBuyNow}
                  className="w-full h-12 bg-primary text-primary-foreground font-mono font-bold tracking-wider hover:bg-primary/90"
                >
                  BUY NOW — ${(product.price * quantity).toFixed(2)}
                </Button>
                <Button
                  onClick={toggleFav}
                  variant="outline"
                  className={`w-full h-12 border-border hover:border-foreground font-mono text-sm ${fav ? 'text-primary border-primary' : ''}`}
                >
                  <Heart className={`w-4 h-4 mr-2 ${fav ? 'fill-primary' : ''}`} />
                  {fav ? 'SAVED TO FAVORITES' : 'SAVE TO FAVORITES'}
                </Button>
              </div>
            </div>
          </div>

          {/* Reviews & Related */}
          <div className="mt-16 space-y-16">
            <ReviewSection productId={productId} userOrders={userOrders} />
            <RelatedProducts product={product} favorites={favMap} />
          </div>
        </div>
      </main>
      <Footer />

      {/* ── MOBILE ONLY: Sticky bottom purchase bar ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border flex items-center"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Left: icon actions */}
        <div className="flex items-center border-r border-border flex-shrink-0">
          {/* Favorites */}
          <button
            onClick={toggleFav}
            className="flex flex-col items-center justify-center gap-0.5 w-14 h-14 text-muted-foreground hover:text-primary transition-colors"
          >
            <Heart className={`w-5 h-5 ${fav ? 'fill-primary text-primary' : ''}`} />
            <span className="font-mono text-[9px] uppercase leading-none">{fav ? 'Saved' : 'Save'}</span>
          </button>
          {/* Qty controls */}
          <div className="flex items-center gap-0 px-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-7 h-7 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground rounded"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center font-mono text-sm font-bold">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-7 h-7 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground rounded"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Buy Now button */}
        <button
          onClick={handleBuyNow}
          className="flex-1 h-14 bg-primary text-primary-foreground font-mono font-bold text-sm tracking-wider flex flex-col items-center justify-center leading-tight active:bg-primary/90"
        >
          <span className="text-[10px] font-normal opacity-75 uppercase tracking-widest">Buy Now</span>
          <span className="text-base font-black">${(product.price * quantity).toFixed(2)}</span>
        </button>
      </div>
    </div>
  );
}