import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, Search, Menu, X, LogOut, UserCircle, Sun, Moon, LogIn } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { getAutocompleteSuggestions } from '@/lib/searchProducts';

export default function Navbar({ onSearchChange, searchValue }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // Respect saved preference, else fall back to system
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const searchRef = useRef(null);
  const location = useLocation();

  // Apply theme to <html> and persist preference
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Listen for OS-level theme changes (only if user hasn't manually set a preference)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (!localStorage.getItem('theme')) {
        setDarkMode(e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  const isAdmin = user?.role === 'admin';

  const navLinks = [
    { label: 'Shop', path: '/' },
    { label: 'Orders', path: '/orders' },
    { label: 'Favorites', path: '/favorites' },
    { label: 'Messages', path: '/messages' },
    { label: 'About', path: '/about' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50"
      style={{ background: 'linear-gradient(90deg, #0a0a0a 0%, #111 50%, #0a0a0a 100%)', borderBottom: '1px solid rgba(180,255,0,0.12)' }}
    >
      <div className="max-w-[140rem] mx-auto px-3 sm:px-5">
        <div className="flex items-center gap-2 sm:gap-3 h-14">

          {/* Mobile hamburger — left of logo */}
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-full transition-all flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-4 h-4 text-white/70" /> : <Menu className="w-4 h-4 text-white/70" />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="relative">
              <img
                src="https://media.base44.com/images/public/69e1001a5f1c0bc3344169f5/6811e703c_Gemini_Generated_Image_olhtx9olhtx9olht.png"
                alt="Ethiodo"
                className="h-8 w-8 rounded-full"
                style={{ boxShadow: '0 0 10px rgba(180,255,0,0.35)' }}
              />
            </div>
            <span className="font-bold text-base tracking-tight hidden sm:block text-white" style={{ textShadow: '0 0 12px rgba(180,255,0,0.3)' }}>
              ETHIODO
            </span>
          </Link>

          {/* Search bar — center, wide */}
          {onSearchChange && (
            <div ref={searchRef} className="flex-1 relative mx-1 sm:mx-2">
              <div
                className="flex items-center rounded-full overflow-hidden transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: showSuggestions ? '0 0 0 2px rgba(180,255,0,0.25)' : 'none',
                }}
              >
                <Search className="w-4 h-4 ml-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input
                  type="text"
                  placeholder="Search product name here…"
                  value={searchValue || ''}
                  onChange={e => handleSearchInput(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  onKeyDown={e => { if (e.key === 'Escape') setShowSuggestions(false); }}
                  className="flex-1 bg-transparent text-sm outline-none px-3 py-2.5 text-white placeholder-white/30 min-w-0"
                />
                {searchValue && (
                  <button onClick={() => { onSearchChange(''); setShowSuggestions(false); }} className="px-2">
                    <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  </button>
                )}
                {/* Search button */}
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold flex-shrink-0 mr-1 my-0.5 transition-all"
                  style={{
                    background: 'hsl(72,100%,50%)',
                    color: '#0a0a0a',
                    boxShadow: '0 0 12px rgba(180,255,0,0.4)',
                  }}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-2xl z-50"
                  style={{ background: '#161616', border: '1px solid rgba(180,255,0,0.2)' }}
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onMouseDown={() => handleSuggestionClick(s)}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-white/5 text-white/70 hover:text-white"
                    >
                      <Search className="w-3 h-3 flex-shrink-0" style={{ color: 'hsl(72,100%,50%)' }} />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Right side actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Cart */}
            <Link to="/cart" className="relative hidden sm:flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-white/8">
              <ShoppingCart className="w-4 h-4 text-white/60 hover:text-white" />
              {cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full"
                  style={{ background: 'hsl(72,100%,50%)', color: '#0a0a0a' }}
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Favorites */}
            <Link to="/favorites" className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-white/8">
              <Heart className="w-4 h-4 text-white/60 hover:text-white" />
            </Link>

            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-full transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {darkMode
                ? <Sun className="w-4 h-4 text-white/60" />
                : <Moon className="w-4 h-4 text-white/60" />}
            </button>

            {/* Login / Profile */}
            {user ? (
              <div className="hidden md:flex items-center gap-1.5">
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
                >
                  <UserCircle className="w-3.5 h-3.5" />
                  {user.full_name?.split(' ')[0] || 'Profile'}
                </Link>
                <button
                  onClick={() => base44.auth.logout()}
                  className="flex items-center justify-center w-8 h-8 rounded-full transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <LogOut className="w-3.5 h-3.5 text-white/50" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: 'rgba(180,255,0,0.12)',
                  border: '1px solid rgba(180,255,0,0.4)',
                  color: 'hsl(72,100%,50%)',
                  boxShadow: '0 0 8px rgba(180,255,0,0.15)',
                }}
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </button>
            )}

            {/* Admin link */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden md:flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{ background: 'rgba(157,255,0,0.1)', border: '1px solid rgba(157,255,0,0.3)', color: 'hsl(157,100%,50%)' }}
              >
                Admin
              </Link>
            )}


          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 pt-2" style={{ background: '#111', borderTop: '1px solid rgba(180,255,0,0.1)' }}>
          {/* Mobile search if not already shown */}
          {!onSearchChange && (
            <div className="mb-3 flex items-center rounded-full px-3 py-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Search className="w-4 h-4 mr-2 text-white/30" />
              <input type="text" placeholder="Search product name here…" className="bg-transparent text-sm outline-none w-full text-white placeholder-white/30" />
            </div>
          )}

          <div className="flex flex-col gap-1">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: location.pathname === link.path ? 'hsl(72,100%,50%)' : 'rgba(255,255,255,0.65)',
                  background: location.pathname === link.path ? 'rgba(180,255,0,0.08)' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium" style={{ color: 'hsl(157,100%,50%)' }}>
                Admin Panel
              </Link>
            )}
            <div className="flex items-center gap-2 pt-2 border-t mt-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Link to="/cart" className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-white/60" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <ShoppingCart className="w-4 h-4" /> Cart {cartCount > 0 && <span style={{ color: 'hsl(72,100%,50%)' }}>({cartCount})</span>}
              </Link>
              <Link to="/favorites" className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-white/60" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <Heart className="w-4 h-4" /> Favorites
              </Link>
              {user ? (
                <button onClick={() => base44.auth.logout()} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-white/60" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              ) : (
                <button onClick={() => base44.auth.redirectToLogin()} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold" style={{ background: 'rgba(180,255,0,0.12)', border: '1px solid rgba(180,255,0,0.4)', color: 'hsl(72,100%,50%)' }}>
                  <LogIn className="w-4 h-4" /> Login
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}