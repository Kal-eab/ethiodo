import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import ProductCard from '@/components/store/ProductCard';

export default function Favorites() {
  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => base44.entities.Favorite.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
  });

  const productMap = {};
  products.forEach(p => { productMap[p.id] = p; });

  const favMap = {};
  favorites.forEach(f => { favMap[f.product_id] = f.id; });

  const favProducts = favorites
    .map(f => productMap[f.product_id])
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Favorites" />
      <Navbar />
      <main className="pt-16 pb-20 md:pb-0">
        <div className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold mb-2">Favorites</h1>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-8">
            {favProducts.length} saved item{favProducts.length !== 1 ? 's' : ''}
          </p>

          {favProducts.length === 0 ? (
            <div className="text-center py-24 space-y-4">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="font-mono text-muted-foreground text-sm">NO FAVORITES YET</p>
              <Link to="/" className="text-primary font-mono text-sm hover:underline">
                BROWSE PRODUCTS
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {favProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={true}
                  favoriteId={favMap[product.id]}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}