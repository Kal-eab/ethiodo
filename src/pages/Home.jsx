import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle } from 'lucide-react';
import Footer from '@/components/store/Footer';
import ProductCard from '@/components/store/ProductCard';
import ComingSoonProductCard from '@/components/store/ComingSoonProductCard';
import CategoryFilter from '@/components/store/CategoryFilter';
import Navbar from '@/components/store/Navbar';
import SEO from '@/components/SEO';
import { searchProducts } from '@/lib/searchProducts';
import { useDebounce } from '@/lib/useDebounce';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/store/PullToRefreshIndicator';
import { track } from '@/lib/track';
import { trackCategoryFilter } from '@/lib/analytics';
import { getSubcategories, getCategoryTreeDynamic, useCategoryTree } from '@/lib/categories';

export default function Home() {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Subscribe to backend category tree changes so the filter re-renders
  useCategoryTree();

  const { data: products = [], isLoading, error: productsError } = useQuery({
    queryKey: ['products'],
    // @ts-ignore
    queryFn: () => base44.entities.Product.filter({ published: true }, '-created_date', 200),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: draftProducts = [] } = useQuery({
    queryKey: ['products', 'coming_soon'],
    // @ts-ignore
    queryFn: () => base44.entities.Product.filter({ published: false, coming_soon: true }, '-created_date', 50),
    retry: false,
    throwOnError: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    // @ts-ignore
    queryFn: () => base44.entities.Favorite.list().catch(() => []),
    retry: false,
  });

  /**
   * @param {React.MouseEvent} e
   * @param {any} product
   */
  const toggleFavorite = useCallback(async (e, product) => {
    if (!product) return;
    e.preventDefault();
    e.stopPropagation();
    const fav = favorites.find(f => f.product_id === product.id);
    if (fav) {
      // @ts-ignore
      queryClient.setQueryData(['favorites'], (old = []) => old.filter(f => f.id !== fav.id));
      await base44.entities.Favorite.delete(fav.id);
    } else {
      const tempId = `temp-${Date.now()}`;
      // @ts-ignore
      queryClient.setQueryData(['favorites'], (old = []) => [...old, { id: tempId, product_id: product.id }]);
      await base44.entities.Favorite.create({ product_id: product.id });
    }
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
  }, [favorites, queryClient]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [queryClient]);

  const { pulling, progress } = usePullToRefresh(handleRefresh);

  const allSearchable = [...products, ...draftProducts];
  const searchResults = searchProducts(allSearchable, search);
  
  /** @param {any} p */
  const categoryMatches = (p) => {
    if (!p) return false;
    if (category === 'all') return true;
    const pCat = (p.category || '').toLowerCase();
    const targetCat = category.toLowerCase();
    if (pCat === targetCat) return true;
    const subs = getSubcategories(category);
    return subs.some(s => s.value && s.value.toLowerCase() === pCat);
  };

  const filtered = searchResults.filter(categoryMatches);
  const draftFiltered = draftProducts.filter(categoryMatches);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedFiltered = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => {
    if (search.length > 2) {
      track.search(search);
    }
  }, [search]);

  const isFiltering = search.trim() || category !== 'all';

  // Does the selected category have subcategories? (affects category bar height)
  const hasSubcats = (() => {
    const tree = getCategoryTreeDynamic();
    const topCat = tree.find(c => c.value === category || c.subcategories.some(s => s.value === category));
    return topCat ? topCat.subcategories.length > 0 : false;
  })();



  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Ethiodo — Online Shopping in Ethiopia | ኢትዮዶ"
        description="Ethiopia's #1 online store. Shop electronics, fashion, home goods. Fast delivery to Addis Ababa, Dire Dawa, Bahir Dar and all regions. Pay on delivery available."
        keywords="Ethiopian online shop, online shopping Ethiopia, buy online Ethiopia, ኦንላይን ሱቅ, online order Ethiopia"
        url="https://www.ethiodo.com"
        image="https://media.base44.com/images/public/69e1001a5f1c0bc3344169f5/9143c5b71_Gemini_Generated_Image_gon5mugon5mugon5.png"
      />
      <PullToRefreshIndicator progress={progress} pulling={pulling} />
      <Navbar onSearchChange={setSearchInput} searchValue={searchInput} category={category} onCategoryChange={(c) => { setCategory(c); setPage(1); }} />

      {/* Sticky category bar under navbar — sits flush below navbar regardless of its height */}
      <div
        className="fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 py-2"
        style={{ top: 'var(--navbar-height, 104px)' }}
      >
        <CategoryFilter active={category} onChange={(c) => { setCategory(c); setPage(1); trackCategoryFilter(c); }} />
      </div>

      <main
        className="pb-4"
        style={{ paddingTop: hasSubcats ? 'calc(var(--navbar-height, 104px) + 82px)' : 'calc(var(--navbar-height, 104px) + 44px)' }}
      >


        {productsError && (
          <div className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-destructive">Failed to load products</p>
                <p className="font-mono text-xs text-destructive/70 mt-0.5">Please try refreshing the page</p>
              </div>
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
                className="px-4 py-2 bg-destructive text-destructive-foreground font-mono text-xs rounded hover:bg-destructive/90 transition-colors flex-shrink-0">
                Retry
              </button>
            </div>
          </div>
        )}

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
          <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="font-mono text-muted-foreground text-sm">NO PRODUCTS FOUND</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                  {paginatedFiltered.map(product => {
                    const fav = favorites.find(f => f.product_id === product.id);
                    if (product.coming_soon) {
                      return (
                        <ComingSoonProductCard
                          key={product.id}
                          product={product}
                          isFavorite={!!fav}
                          onToggleFavorite={toggleFavorite}
                          onNavigate={navigate}
                        />
                      );
                    }
                    return (
                      <ProductCard key={product.id} product={product} isFavorite={!!fav} favoriteId={fav?.id} />
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="font-mono text-[10px] px-4 py-2 border border-border text-muted-foreground hover:border-foreground transition-colors disabled:opacity-30">
                      ← PREV
                    </button>
                    <span className="font-mono text-[10px] text-muted-foreground px-4 py-2 border border-border">
                      {page} / {totalPages}
                    </span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="font-mono text-[10px] px-4 py-2 border border-border text-muted-foreground hover:border-foreground transition-colors disabled:opacity-30">
                      NEXT →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        ) : (
          <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-1">
            <div className="flex items-center gap-2 mb-2">
            <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">All Products</h2>
          </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
              {products.map(product => {
                const fav = favorites.find(f => f.product_id === product.id);
                return (
                  <ProductCard key={product.id} product={product} isFavorite={!!fav} favoriteId={fav?.id} />
                );
              })}
              {draftFiltered.map(product => {
                const fav = favorites.find(f => f.product_id === product.id);
                return (
                  <ComingSoonProductCard
                    key={product.id}
                    product={product}
                    isFavorite={!!fav}
                    onToggleFavorite={toggleFavorite}
                    onNavigate={navigate}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}