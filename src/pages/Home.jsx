import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, X } from 'lucide-react';
import Footer from '@/components/store/Footer';
import ProductCard from '@/components/store/ProductCard';
import CategoryFilter from '@/components/store/CategoryFilter';
import Navbar from '@/components/store/Navbar';
import { searchProducts } from '@/lib/searchProducts';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/store/PullToRefreshIndicator';

export default function Home() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 100),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => base44.entities.Favorite.list(),
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    await queryClient.invalidateQueries({ queryKey: ['favorites'] });
  }, [queryClient]);

  const { pulling, progress } = usePullToRefresh(handleRefresh);

  const favMap = {};
  favorites.forEach(f => { favMap[f.product_id] = f.id; });

  const searchResults = searchProducts(products, search);
  const filtered = searchResults.filter(p => {
    return category === 'all' || p.category === category;
  });

  const featured = products.filter(p => p.featured);

  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator progress={progress} pulling={pulling} />
      <Navbar onSearchChange={setSearch} searchValue={search} category={category} onCategoryChange={setCategory} />

      {/* Sticky category bar under navbar — desktop only */}
      <div className="hidden md:block fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 py-2">
        <CategoryFilter active={category} onChange={setCategory} />
      </div>

      <main className="pt-16 md:pt-28 pb-20 md:pb-4">
        {/* Ultra-compact hero */}
        <section className="border-b border-border/50 bg-card/20">
          <div className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight leading-none">
                Welcome to <span className="text-primary">Ethiodo</span>
              </h1>
              <p className="text-muted-foreground text-[11px] mt-0.5 hidden sm:block">
                Your premium online marketplace.
              </p>
            </div>

          </div>
        </section>

        {/* Products */}
        <section id="products" className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* Mobile search */}
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

          {isLoading ? (
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
          ) : filtered.length === 0 ? (
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
      </main>
      <Footer />
    </div>
  );
}