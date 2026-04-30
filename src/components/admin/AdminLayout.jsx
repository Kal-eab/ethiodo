import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, MessageSquare, ArrowLeft, Menu, X, Mail, Star, Sparkles, DollarSign, Users, BarChart2, FolderTree } from 'lucide-react';
import NotificationBell from '@/components/admin/NotificationBell';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/categories', label: 'Categories', icon: FolderTree },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/admin/messages', label: 'Messages', icon: Mail },
  { path: '/admin/requests', label: 'Requests', icon: MessageSquare },
  { path: '/admin/reviews', label: 'Reviews', icon: Star },
  { path: '/admin/review-insights', label: 'Review Insights AI', icon: Sparkles },
  { path: '/admin/revenue', label: 'Revenue', icon: DollarSign },
  { path: '/admin/customers', label: 'Customers', icon: Users },
  { path: '/admin/conversion-rates', label: 'Conversion Rates', icon: BarChart2 },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u.role !== 'admin') navigate('/');
      else setUser(u);
    }).catch(() => navigate('/'));
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border flex flex-col transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="https://media.base44.com/images/public/69e1001a5f1c0bc3344169f5/9143c5b71_Gemini_Generated_Image_gon5mugon5mugon5.png" alt="Ethiodo" className="h-7 w-auto" />
            <span className="font-bold text-sm">Admin</span>
          </div>
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Link>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 h-14 flex items-center gap-4">
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            Control Deck
          </span>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}