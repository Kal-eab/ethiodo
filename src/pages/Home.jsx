import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, ArrowRight } from 'lucide-react';
import Footer from '@/components/store/Footer';
import { Link } from 'react-router-dom';
import ProductCard from '@/components/store/ProductCard';
import CategoryFilter from '@/components/store/CategoryFilter';
import Navbar from '@/components/store/Navbar';
import { searchProducts } from '@/lib/searchProducts';

export default function Home() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 100),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => base44.entities.Favorite.list(),
  });

  const favMap = {};
  favorites.forEach(f => { favMap[f.product_id] = f.id; });

  const searchResults = searchProducts(products, search);
  const filtered = searchResults.filter(p => {
    return category === 'all' || p.category === category;
  });

  const featured = products.filter(p => p.featured);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onSearchChange={setSearch} searchValue={search} />

      {/* Sticky category bar under navbar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 py-2">
        <CategoryFilter active={category} onChange={setCategory} />
      </div>

      <main className="pt-28 pb-20 md:pb-4">
        {/* Compact Hero */}
        <section className="border-b border-border">
          <div className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] text-primary uppercase tracking-[0.3em] mb-1">ethiodo</p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                  Premium Marketplace
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1 hidden sm:block">
                  Browse, order, and track with precision.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/#products"
                  onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 font-mono text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  BROWSE <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-1.5 border border-border text-foreground px-4 py-2 font-mono text-xs hover:border-muted-foreground transition-colors"
                >
                  CONTACT
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Products */}
        <section id="products" className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Mobile search */}
          <div className="lg:hidden mb-4">
            <div className="flex items-center bg-secondary border border-border px-3 py-2.5 w-full">
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
                  <Search className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card border border-border animate-pulse">
                  <div className="aspect-square bg-secondary" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-secondary w-3/4" />
                    <div className="h-4 bg-secondary w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-mono text-muted-foreground text-sm">NO PRODUCTS FOUND</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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