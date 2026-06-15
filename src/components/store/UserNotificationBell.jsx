import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, ShoppingBag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';

export default function UserNotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;
    const load = () => {
      base44.entities.UserNotification.filter({ user_id: user.id }, '-created_date', 30)
        .then(setNotifications).catch(() => {});
    };
    load();
    // Real-time subscription
    const unsub = base44.entities.UserNotification.subscribe((event) => {
      if (event.data?.user_id === user.id) load();
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  const markRead = async (n) => {
    if (n.is_read) return;
    await base44.entities.UserNotification.update(n.id, { is_read: true }).catch(() => {});
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
  };

  const markAllRead = async () => {
    const unreadOnes = notifications.filter(n => !n.is_read);
    await Promise.all(unreadOnes.map(n => base44.entities.UserNotification.update(n.id, { is_read: true }).catch(() => {})));
    setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-full transition-all relative"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Bell className="w-4 h-4 text-white/60" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold px-0.5"
            style={{ background: 'hsl(72,100%,50%)', color: '#0a0a0a' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl z-[100] overflow-hidden"
          style={{ background: '#161616', border: '1px solid rgba(180,255,0,0.15)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <span className="font-semibold text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)}>
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <Link
                  key={n.id}
                  to={n.product_id ? `/product/${n.product_id}` : '#'}
                  onClick={() => { markRead(n); setOpen(false); }}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5"
                  style={!n.is_read ? { background: 'rgba(180,255,0,0.04)' } : {}}
                >
                  {n.product_image
                    ? <img src={n.product_image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-secondary" />
                    : <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-4 h-4 text-muted-foreground" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-snug">{n.title}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.body}</p>
                    {n.product_price && (
                      <p className="text-xs font-mono font-bold mt-1" style={{ color: 'hsl(72,100%,50%)' }}>
                        {Number(n.product_price).toLocaleString()} Birr
                      </p>
                    )}
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: 'hsl(72,100%,50%)' }} />
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}