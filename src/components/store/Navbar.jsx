import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, Search, Menu, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { getAutocompleteSuggestions } from '@/lib/searchProducts';

export default function Navbar({ onSearchChange, searchValue }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 100),
  });

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const handleSearchInput = (value) => {
    onSearchChange(value);
    const s = getAutocompleteSuggestions(products, value, 6);
    setSuggestions(s);
    setShowSuggestions(s.length > 0 && value.trim().length > 0);
  };

  const handleSuggestionClick = (suggestion) => {
    onSearchChange(suggestion);
    setShowSuggestions(false);
  };

  const navLinks = [
    { label: 'Shop', path: '/' },
    { label: 'Orders', path: '/orders' },
    { label: 'Favorites', path: '/favorites' },
    { label: 'Messages', path: '/messages' },
  ];

  const isAdmin = user?.role === 'admin';

  const SearchInput = ({ className }) => (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="flex items-center bg-secondary border border-border px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchValue || ''}
          onChange={e => handleSearchInput(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onKeyDown={e => { if (e.key === 'Escape') setShowSuggestions(false); }}
          className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
        />
        {searchValue && (
          <button onClick={() => { onSearchChange(''); setShowSuggestions(false); }}>
            <X className="w-3 h-3 text-muted-foreground hover:text-foreground ml-1" />
          </button>
        )}
      </div>
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border border-t-0 shadow-xl">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={() => handleSuggestionClick(s)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <Search className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo — always goes to home */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img
              src="https://media.base44.com/images/public/69e1001a5f1c0bc3344169f5/6811e703c_Gemini_Generated_Image_olhtx9olhtx9olht.png"
              alt="Ethiodo"
              className="h-8 w-auto"
            />
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
            <SearchInput className="hidden lg:block w-72" />
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

            {/* Mobile menu toggle */}
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
            <div className="mb-4">
              <SearchInput className="w-full" />
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