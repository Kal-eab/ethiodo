import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, MessageSquare, ShoppingCart, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 50),
    refetchInterval: 10000,
  });

  const unread = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    const unreadOnes = notifications.filter(n => !n.is_read);
    await Promise.all(unreadOnes.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markOne = async (id) => {
    await base44.entities.Notification.update(id, { is_read: true });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-mono font-bold w-4 h-4 flex items-center justify-center rounded-full">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Notifications {unread > 0 && <span className="text-primary">({unread})</span>}
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="font-mono text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <p className="p-4 font-mono text-xs text-muted-foreground text-center">No notifications</p>
            ) : (
              notifications.map(n => {
                const Icon = n.type === 'message' ? MessageSquare : ShoppingCart;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 p-4 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center ${
                      n.type === 'message' ? 'bg-blue-500/10 text-blue-400' : 'bg-primary/10 text-primary'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {n.link ? (
                        <Link
                          to={n.link}
                          onClick={() => { markOne(n.id); setOpen(false); }}
                          className="text-sm leading-snug hover:text-primary transition-colors line-clamp-2"
                        >
                          {n.content}
                        </Link>
                      ) : (
                        <p className="text-sm leading-snug line-clamp-2">{n.content}</p>
                      )}
                      <p className="font-mono text-[10px] text-muted-foreground mt-1">
                        {n.created_date ? format(new Date(n.created_date), 'MMM d, HH:mm') : ''}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button onClick={() => markOne(n.id)} className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}