import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, ArrowRight } from 'lucide-react';
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
      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="max-w-2xl">
              <p className="font-mono text-xs text-primary uppercase tracking-[0.3em] mb-4">
                ethiodo
              </p>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.9] mb-6">
                Ethiodo
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-lg mb-8">
                A curated marketplace of premium products. Browse, order, and track with precision.
              </p>
              <div className="flex gap-3">
                <Link
                  to="/#products"
                  onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 font-mono text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  BROWSE
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 border border-border text-foreground px-6 py-3 font-mono text-sm hover:border-muted-foreground transition-colors"
                >
                  CONTACT
                </Link>
              </div>
            </div>
          </div>
          {/* Decorative grid */}
          <div className="absolute top-0 right-0 w-1/2 h-full hidden lg:block opacity-10">
            <div className="grid grid-cols-4 grid-rows-4 h-full gap-px">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="border border-border" />
              ))}
            </div>
          </div>
        </section>

        {/* Products */}
        <section id="products" className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Mobile search */}
          <div className="lg:hidden mb-6">
            <div className="flex items-center bg-secondary border border-border px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground mr-2" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Sticky filter ribbon */}
          <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl py-4 mb-8 border-b border-border -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <CategoryFilter active={category} onChange={setCategory} />
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-6">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-card border border-border animate-pulse">
                  <div className="aspect-square bg-secondary" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-secondary w-3/4" />
                    <div className="h-5 bg-secondary w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-mono text-muted-foreground text-sm">NO PRODUCTS FOUND</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
    </div>
  );
}