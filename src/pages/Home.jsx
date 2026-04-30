import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '@/components/store/Footer';
import ProductCard from '@/components/store/ProductCard';
import CategoryFilter from '@/components/store/CategoryFilter';
import Navbar from '@/components/store/Navbar';
import SEO from '@/components/SEO';
import { searchProducts } from '@/lib/searchProducts';
import { useDebounce } from '@/lib/useDebounce';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/store/PullToRefreshIndicator';
import TrendingSection from '@/components/home/TrendingSection';
import RecommendedSection from '@/components/home/RecommendedSection';
import BecauseYouViewedSection from '@/components/home/BecauseYouViewedSection';
import NewAndRisingSection from '@/components/home/NewAndRisingSection';
import { getGuestRecentlyViewed } from '@/lib/behaviorTracker';
import { trackSearch, trackCategoryFilter } from '@/lib/analytics';
import { getSubcategories } from '@/lib/categories';

export default function Home() {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
    queryFn: () => base44.entities.Product.filter({ published: true }, '-created_date', 200),
    retry: false,
    throwOnError: false,
    staleTime: 5 * 60 * 1000,
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
  const filtered = searchResults.filter(p => {
    if (category === 'all') return true;
    if (p.category === category) return true;
    // If top-level category selected, also show products in its subcategories
    const subs = getSubcategories(category);
    return subs.some(s => s.value === p.category);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedFiltered = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Trending: top 8 by trendingScore
  const trendingProducts = [...products]
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
    .slice(0, 8);

  // Guest recently viewed products
  const guestRecentProducts = guestRecentIds
    .map(id => products.find(p => p.id === id))
    .filter(Boolean)
    .slice(0, 6);

  useEffect(() => {
    if (search.length > 2) trackSearch(search);
  }, [search]);

  const isFiltering = search.trim() || category !== 'all';

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Ethiodo — Online Shopping in Ethiopia | ኢትዮዶ"
        description="Ethiopia's #1 online store. Shop electronics, fashion, home goods. Fast delivery to Addis Ababa, Dire Dawa, Bahir Dar and all regions. Pay on delivery available."
        keywords="Ethiopian online shop, online shopping Ethiopia, buy online Ethiopia, ኦንላይን ሱቅ, online order Ethiopia"
        url="https://www.ethiodo.com"
      />
      <PullToRefreshIndicator progress={progress} pulling={pulling} />
      <Navbar onSearchChange={setSearchInput} searchValue={searchInput} category={category} onCategoryChange={(c) => { setCategory(c); setPage(1); trackCategoryFilter(c); }} />

      {/* Sticky category bar under navbar — desktop only */}
      <div className="hidden md:block fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 py-2">
        <CategoryFilter active={category} onChange={(c) => { setCategory(c); trackCategoryFilter(c); }} />
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
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setPage(1); }}
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(''); setPage(1); }} className="ml-1 text-muted-foreground">
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
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                  {paginatedFiltered.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isFavorite={!!favMap[product.id]}
                      favoriteId={favMap[product.id]}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="font-mono text-[10px] px-4 py-2 border border-border text-muted-foreground hover:border-foreground transition-colors disabled:opacity-30"
                    >
                      ← PREV
                    </button>
                    <span className="font-mono text-[10px] text-muted-foreground px-4 py-2 border border-border">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="font-mono text-[10px] px-4 py-2 border border-border text-muted-foreground hover:border-foreground transition-colors disabled:opacity-30"
                    >
                      NEXT →
                    </button>
                  </div>
                )}
              </>
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