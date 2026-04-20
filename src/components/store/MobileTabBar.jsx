import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, Package, MessageSquare, ShoppingCart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const tabs = [
  { path: '/', icon: Home, label: 'Shop' },
  { path: '/favorites', icon: Heart, label: 'Favorites' },
  { path: '/cart', icon: ShoppingCart, label: 'Cart' },
  { path: '/orders', icon: Package, label: 'Orders' },
  { path: '/messages', icon: MessageSquare, label: 'Messages' },
];

export default function MobileTabBar() {
  const location = useLocation();

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
  });

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Hide on admin pages
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 h-14">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path);
          const isCart = tab.path === '/cart';

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b" />
              )}
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isCart && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-mono font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              <span className="font-mono text-[9px] uppercase leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}