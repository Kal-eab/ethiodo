import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, Search, Menu, X, User, Package, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function Navbar({ onSearchChange, searchValue }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
  });

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const navLinks = [
    { label: 'Shop', path: '/' },
    { label: 'Orders', path: '/orders' },
    { label: 'Favorites', path: '/favorites' },
    { label: 'Contact', path: '/contact' },
  ];

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="https://media.base44.com/images/public/69e1001a5f1c0bc3344169f5/6811e703c_Gemini_Generated_Image_olhtx9olhtx9olht.png" alt="Ethiodo" className="h-8 w-auto" />
            <span className="font-bold text-lg tracking-tight hidden sm:block">Ethiodo</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.path ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className={`text-sm font-medium transition-colors hover:text-accent ${
                  location.pathname.startsWith('/admin') ? 'text-accent' : 'text-muted-foreground'
                }`}
              >
                Admin
              </Link>
            )}
          </div>

          {/* Search (desktop) */}
          {onSearchChange && (
            <div className="hidden lg:flex items-center bg-secondary border border-border px-3 py-2 w-72">
              <Search className="w-4 h-4 text-muted-foreground mr-2" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchValue || ''}
                onChange={e => onSearchChange(e.target.value)}
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link to="/favorites">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Heart className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ShoppingCart className="w-5 h-5" />
              </Button>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-mono font-bold w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            
            {user ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => base44.auth.logout()}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            ) : null}

            {/* Mobile menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-background border-b border-border px-4 pb-4">
          {onSearchChange && (
            <div className="flex items-center bg-secondary border border-border px-3 py-2 mb-4">
              <Search className="w-4 h-4 text-muted-foreground mr-2" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchValue || ''}
                onChange={e => onSearchChange(e.target.value)}
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
              />
            </div>
          )}
          <div className="flex flex-col gap-3">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`text-sm font-medium py-2 transition-colors ${
                  location.pathname === link.path ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium py-2 text-accent"
              >
                Admin Panel
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}