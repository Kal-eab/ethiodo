import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Heart, Package, MessageSquare } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'Shop' },
  { path: '/favorites', icon: Heart, label: 'Favorites' },
  { path: '/orders', icon: Package, label: 'Orders' },
  { path: '/messages', icon: MessageSquare, label: 'Messages' },
];

// Save current path for a tab's root
function saveTabPath(tabPath, currentPath) {
  sessionStorage.setItem(`tab_stack_${tabPath}`, currentPath);
}

// Get last saved path for a tab (falls back to tab root)
function getTabPath(tabPath) {
  return sessionStorage.getItem(`tab_stack_${tabPath}`) || tabPath;
}

export default function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Persist current path into the active tab's stack on every navigation
  useEffect(() => {
    const activeTab = tabs.find(t =>
      t.path === '/'
        ? location.pathname === '/' || location.pathname.startsWith('/product')
        : location.pathname.startsWith(t.path)
    );
    if (activeTab) {
      saveTabPath(activeTab.path, location.pathname + location.search);
    }
  }, [location.pathname]);

  // Hide on admin pages and pages with their own sticky bottom bars
  if (location.pathname.startsWith('/admin')) return null;
  if (location.pathname.startsWith('/product/')) return null;
  if (location.pathname.startsWith('/payment')) return null;
  if (location.pathname.startsWith('/messages')) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4 h-14">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = tab.path === '/'
            ? location.pathname === '/' || location.pathname.startsWith('/product')
            : location.pathname.startsWith(tab.path);

          const handleTabPress = () => {
            if (isActive) {
              // Already on this tab — reset to root
              navigate(tab.path, { replace: true });
              saveTabPath(tab.path, tab.path);
            } else {
              // Restore last position in this tab's stack
              const savedPath = getTabPath(tab.path);
              navigate(savedPath);
            }
          };

          return (
            <button
              key={tab.path}
              onClick={handleTabPress}
              className={`flex flex-col items-center justify-center gap-0.5 relative transition-colors w-full ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b" />
              )}
              <div className="relative">
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-mono text-[9px] uppercase leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}