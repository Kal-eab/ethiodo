import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, X, LogIn } from 'lucide-react';
import Footer from '@/components/store/Footer';
import ProductCard from '@/components/store/ProductCard';
import CategoryFilter from '@/components/store/CategoryFilter';
import Navbar from '@/components/store/Navbar';
import { searchProducts } from '@/lib/searchProducts';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/store/PullToRefreshIndicator';
import TrendingSection from '@/components/home/TrendingSection';
import RecommendedSection from '@/components/home/RecommendedSection';
import BecauseYouViewedSection from '@/components/home/BecauseYouViewedSection';
import NewAndRisingSection from '@/components/home/NewAndRisingSection';
import { getGuestRecentlyViewed } from '@/lib/behaviorTracker';

export default function Home() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [guestRecentIds, setGuestRecentIds] = useState([]);

  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      setIsAuth(auth);
      if (auth) base44.auth.me().then(setUser).catch(() => {});
    }).catch(() => {});
    setGuestRecentIds(getGuestRecentlyViewed());
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
    retry: false,
    throwOnError: false,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => base44.entities.Favorite.list(),
    enabled: isAuth,
  });

  const { data: userBehavior } = useQuery({
    queryKey: ['user-behavior', user?.email],
    queryFn: async () => {
      const res = await base44.entities.UserBehavior.filter({ user_email: user.email }, null, 1);
      return res[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders-purchased'],
    queryFn: () => base44.entities.Order.filter({ customer_email: user?.email }, null, 200),
    enabled: !!user?.email,
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    await queryClient.invalidateQueries({ queryKey: ['favorites'] });
  }, [queryClient]);

  const { pulling, progress } = usePullToRefresh(handleRefresh);


  const favMap = {};
  favorites.forEach(f => { favMap[f.product_id] = f.id; });

  const purchasedProductIds = [...new Set(
    orders.flatMap(o => (o.items || []).map(i => i.product_id))
  )];

  const searchResults = searchProducts(products, search);
  const filtered = searchResults.filter(p => category === 'all' || p.category === category);

  // Trending: top 8 by trendingScore
  const trendingProducts = [...products]
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
    .slice(0, 8);

  // Guest recently viewed products
  const guestRecentProducts = guestRecentIds
    .map(id => products.find(p => p.id === id))
    .filter(Boolean)
    .slice(0, 6);

  const isFiltering = search.trim() || category !== 'all';

  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator progress={progress} pulling={pulling} />
      <Navbar onSearchChange={setSearch} searchValue={search} category={category} onCategoryChange={setCategory} />

      {/* Sticky category bar under navbar — desktop only */}
      <div className="hidden md:block fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 py-2">
        <CategoryFilter active={category} onChange={setCategory} />
      </div>

      <main className="pt-16 md:pt-28 pb-20 md:pb-4">
        {/* Mobile search */}
        <div className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 pt-3">
          <div className="lg:hidden mb-3">
            <div className="flex items-center bg-secondary border border-border px-3 py-2 w-full rounded-lg">
              <Search className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
              />
              {search && (
                <button onClick={() => setSearch('')} className="ml-1 text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl animate-pulse overflow-hidden">
                  <div className="aspect-[4/3] bg-secondary" />
                  <div className="p-2.5 space-y-1.5">
                    <div className="h-3 bg-secondary rounded w-3/4" />
                    <div className="h-4 bg-secondary rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isFiltering ? (
          // ── Filtered / search results ──
          <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="font-mono text-muted-foreground text-sm">NO PRODUCTS FOUND</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {filtered.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFavorite={!!favMap[product.id]}
                    favoriteId={favMap[product.id]}
                  />
                ))}
              </div>
            )}
          </section>
        ) : isAuth ? (
          // ── Logged-in personalized view ──
          <div className="space-y-2">
            <RecommendedSection
              products={products}
              userProfile={userBehavior}
              favorites={favMap}
              purchasedProductIds={purchasedProductIds}
            />
            <TrendingSection products={trendingProducts} favorites={favMap} />
            <BecauseYouViewedSection
              products={products}
              viewedProductIds={userBehavior?.viewed_products || []}
              favorites={favMap}
            />
            <NewAndRisingSection products={products} favorites={favMap} />
            <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">All Products</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFavorite={!!favMap[product.id]}
                    favoriteId={favMap[product.id]}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : (
          // ── Guest view ──
          <div className="space-y-2">
            <TrendingSection products={trendingProducts} favorites={favMap} />

            {/* Sign-in / Register banner */}
            <div className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8">
              <div className="border border-primary/20 bg-card/60 p-4 sm:p-5"
                style={{ background: 'linear-gradient(135deg, rgba(180,255,0,0.04) 0%, rgba(0,0,0,0) 100%)' }}>
                <p className="font-bold text-sm sm:text-base mb-1">Welcome to Ethiodo 👋</p>
                <p className="font-mono text-xs text-muted-foreground mb-4">Sign in or create an account to get personalized recommendations, track orders, and save favorites.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => base44.auth.redirectToLogin(window.location.href)}
                    className="flex-1 h-11 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-mono font-bold text-sm hover:bg-primary/90 transition-colors"
                  >
                    <LogIn className="w-4 h-4" /> Login
                  </button>
                  <button
                    onClick={() => base44.auth.redirectToLogin(window.location.href)}
                    className="flex-1 h-11 flex items-center justify-center gap-2 border border-primary/50 text-primary font-mono font-bold text-sm hover:bg-primary/10 transition-colors"
                  >
                    Register
                  </button>
                </div>
              </div>
            </div>

            {/* Guest recently viewed */}
            {guestRecentProducts.length > 0 && (
              <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Recently Viewed</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                  {guestRecentProducts.map(product => (
                    <ProductCard key={product.id} product={product} isFavorite={false} favoriteId={null} />
                  ))}
                </div>
              </section>
            )}

            <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">All Products</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} isFavorite={false} favoriteId={null} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}