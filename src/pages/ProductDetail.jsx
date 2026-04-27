import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Heart, Star, Minus, Plus, ShieldCheck, Truck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import ReviewSection from '@/components/product/ReviewSection';
import RelatedProducts from '@/components/product/RelatedProducts';
import Footer from '@/components/store/Footer';
import { trackView, trackWishlist } from '@/lib/behaviorTracker';

const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

export default function ProductDetail() {
  const pathParts = window.location.pathname.split('/');
  const productId = pathParts[pathParts.length - 1];
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [sizeError, setSizeError] = useState('');
  const sizeRef = useRef(null);

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

  // Track view when product loads
  useEffect(() => {
    if (!product) return;
    base44.auth.me().then(u => trackView(product, u)).catch(() => trackView(product, null));
  }, [product?.id]);

  const fav = favorites.find(f => f.product_id === productId);
  const favMap = {};
  favorites.forEach(f => { favMap[f.product_id] = f.id; });

  const handleBuyNow = async () => {
    if (product?.sizes?.length > 0 && !selectedSize) {
      setSizeError('Please select a size to continue.');
      if (sizeRef.current) {
        sizeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setSizeError('');
    // Require login before buying
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    const sizeParam = selectedSize ? `&size=${encodeURIComponent(selectedSize)}` : '';
    navigate(`/payment?product=${productId}&qty=${quantity}${sizeParam}`);
  };

  const toggleFav = async () => {
    if (fav) {
      await base44.entities.Favorite.delete(fav.id);
    } else {
      await base44.entities.Favorite.create({ product_id: productId });
      // track wishlist event
      base44.auth.me().then(u => trackWishlist(productId, u)).catch(() => {});
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

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 lg:items-start">
            {/* Images */}
            <div className="lg:col-span-3 space-y-3 lg:sticky lg:top-24">
              <div className="border border-border overflow-hidden relative" style={{ width: '100%', height: '70vh', backgroundColor: '#0a0a0a' }}>
                {/* Blurred background fill */}
                <img
                  src={images[selectedImage]}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110"
                />
                {/* Main image — contained, no crop */}
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="relative z-10 w-auto h-auto max-w-full max-h-full m-auto block"
                  style={{ position: 'absolute', inset: 0, margin: 'auto', objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
                />
                {/* Prev / Next arrows — desktop only */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImage(i => Math.max(0, i - 1))}
                      disabled={selectedImage === 0}
                      style={{ opacity: selectedImage === 0 ? 0.2 : 1, pointerEvents: selectedImage === 0 ? 'none' : 'auto' }}
                      className="hidden lg:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center bg-black/50 hover:bg-black/75 text-white border border-white/20 transition-colors"
                      aria-label="Previous image"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedImage(i => (i + 1) % images.length)}
                      className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center bg-black/50 hover:bg-black/75 text-white border border-white/20 transition-colors"
                      aria-label="Next image"
                    >
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
                    <div className="hidden lg:flex absolute bottom-3 left-1/2 -translate-x-1/2 z-20 gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedImage(i)}
                          className={`rounded-full transition-all ${i === selectedImage ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
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
                <span className="font-mono text-3xl font-bold text-primary">{fmt(product.price)} <span className="text-lg font-normal">Birr</span></span>
                {product.stock > 0 && (
                  <p className="font-mono text-xs text-accent mt-2">IN STOCK — {product.stock} available</p>
                )}
              </div>

              {product.description && (
                <div className="space-y-2">
                  <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Description</p>
                  <ul className="space-y-1.5">
                    {product.description.split(',').map((item, i) => item.trim() && (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                        <span>{item.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Size / Options selector */}
              {product.sizes?.length > 0 && (
                <div ref={sizeRef} className="space-y-2">
                  <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                    {product.category === 'phones' ? 'Color' : ['clothing', 'shoes'].includes(product.category) ? 'Size' : 'Option'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map(s => (
                      <button
                        key={s}
                        onClick={() => { setSelectedSize(s); setSizeError(''); }}
                        className={`px-4 py-2 font-mono text-sm border transition-all ${
                          selectedSize === s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-transparent text-muted-foreground border-border hover:border-foreground'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {sizeError && (
                    <p className="font-mono text-xs text-destructive">{sizeError}</p>
                  )}
                </div>
              )}

              {/* Trust signals */}
              <div className="space-y-2 pt-2">
                {[
                  { icon: ShieldCheck, text: 'Secure payment — verified orders' },
                  { icon: Truck, text: 'Fast tracked delivery' },
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



              {/* Desktop Actions */}
              <div className="hidden md:block space-y-3">
                <Button
                  onClick={handleBuyNow}
                  className="w-full h-12 bg-primary text-primary-foreground font-mono font-bold tracking-wider hover:bg-primary/90"
                >
                  BUY NOW — {fmt(product.price * quantity)} Birr
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
        {/* Left: Favorites icon */}
        <div className="flex items-center border-r border-border flex-shrink-0">
          <button
            onClick={toggleFav}
            className="flex flex-col items-center justify-center gap-0.5 w-16 h-14 text-muted-foreground hover:text-primary transition-colors"
          >
            <Heart className={`w-5 h-5 ${fav ? 'fill-primary text-primary' : ''}`} />
            <span className="font-mono text-[9px] uppercase leading-none">{fav ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        {/* Right: Buy Now button */}
        <button
          onClick={handleBuyNow}
          className="flex-1 h-16 bg-primary text-primary-foreground font-mono flex flex-col items-center justify-center leading-tight active:bg-primary/90"
        >
          <span className="text-lg font-black uppercase tracking-widest">BUY NOW</span>
          <span className="text-sm font-semibold opacity-90">{fmt(product.price * quantity)} Birr</span>
        </button>
      </div>
    </div>
  );
}