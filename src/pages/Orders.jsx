import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Package, Star, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '@/components/store/Navbar';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/store/PullToRefreshIndicator';
import ReviewSubmitModal from '@/components/product/ReviewSubmitModal';

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'reviewed'];

const statusColors = {
  pending: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  confirmed: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
  shipped: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
  delivered: 'text-accent border-accent/30 bg-accent/5',
  reviewed: 'text-primary border-primary/30 bg-primary/5',
};

// A single order item is uniquely identified within its order by product —
// reordering the same product later creates a new order_id, so it's a new item.
function orderItemId(order, productId) {
  return `${order.id}::${productId}`;
}

// A delivered order moves to the "Reviewed" tab once every visible item in it
// has been reviewed — this is a query filter, not a real order status.
function isFullyReviewed(order) {
  if (order.status !== 'delivered') return false;
  const visible = (order.items || []).filter(i => !i.removed);
  if (visible.length === 0) return false;
  const reviewedIds = order.reviewed_item_ids || [];
  return visible.every(item => reviewedIds.includes(orderItemId(order, item.product_id)));
}

// ─── Pending notice banner ───────────────────────────────────────────────────
function PendingTransactionBanner() {
  return (
    <div className="mx-5 mt-4 mb-4 flex items-start gap-2 border border-yellow-400/30 bg-yellow-400/5 p-4">
      <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
      <p className="font-mono text-[11px] text-yellow-300/80 leading-relaxed">
        Your order will be confirmed within an hour or so after we verify your payment.
      </p>
    </div>
  );
}

// ─── Single order item row ────────────────────────────────────────────────────
function OrderItemRow({ item, order, isDelivered, onReviewed }) {
  const [showModal, setShowModal] = useState(false);
  const alreadyReviewed = (order.reviewed_item_ids || []).includes(orderItemId(order, item.product_id));

  return (
    <>
      <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
        <div className="w-14 h-14 bg-secondary border border-border flex-shrink-0 overflow-hidden">
          {item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.product_name}</p>
          <p className="font-mono text-xs text-muted-foreground">×{item.quantity} — ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</p>
        </div>
        {isDelivered && (
          alreadyReviewed ? (
            <span className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold border border-primary/30 text-primary bg-primary/5 uppercase">
              <CheckCircle className="w-3 h-3" /> Reviewed
            </span>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold border border-primary/40 text-primary bg-transparent hover:bg-primary/10 transition-colors uppercase"
            >
              <Star className="w-3 h-3" /> Review
            </button>
          )
        )}
      </div>

      {showModal && (
        <ReviewSubmitModal
          item={item}
          order={order}
          onClose={() => setShowModal(false)}
          onSubmitted={() => {
            setShowModal(false);
            onReviewed();
          }}
        />
      )}
    </>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onRefresh }) {
  const visibleItems = (order.items || []).filter(i => !i.removed);
  if (visibleItems.length === 0) return null;

  return (
    <div className="bg-card border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/20">
        <div>
          <p className="font-mono text-xs text-muted-foreground">ORDER #{order.id?.slice(-8).toUpperCase()}</p>
          <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
            {order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy • HH:mm') : ''}
          </p>
        </div>
        <span className="font-mono text-lg font-bold text-primary">${order.total?.toFixed(2)}</span>
      </div>
      <div className="px-5">
        {visibleItems.map((item, i) => (
          <OrderItemRow
            key={i}
            item={item}
            order={order}
            isDelivered={order.status === 'delivered'}
            onReviewed={onRefresh}
          />
        ))}
      </div>
      {order.status === 'pending' && (
        <PendingTransactionBanner />
      )}
      {order.status === 'shipped' && order.shipped_photo_url && (
        <div className="mx-5 mb-4">
          <p className="font-mono text-[10px] text-purple-400 uppercase tracking-wider mb-2">📦 Your package is on its way!</p>
          <a href={order.shipped_photo_url} target="_blank" rel="noopener noreferrer">
            <img src={order.shipped_photo_url} alt="Shipped package" className="w-full max-h-48 object-cover border border-purple-400/30 rounded hover:opacity-90 transition-opacity" />
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Main Orders page ─────────────────────────────────────────────────────────
export default function Orders() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const queryClient = useQueryClient();

  // Request notification permission and subscribe to order status changes
  useEffect(() => {
    if (!user) return;

    // Ask for permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to order updates
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type !== 'update') return;
      const order = event.data;
      if (!order || order.customer_email !== user.email) return;

      const statusLabels = {
        confirmed: 'Your order has been confirmed! ✅',
        shipped: 'Your order is on its way! 🚚',
        delivered: 'Your order has been delivered! 🎉',
      };
      const msg = statusLabels[order.status];
      if (!msg) return;

      // Refresh orders list
      queryClient.invalidateQueries({ queryKey: ['my-orders', user.email] });

      // Play a subtle notification sound using Web Audio API
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch (_) {}

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Ethiodo Order Update', {
          body: msg,
          icon: 'https://media.base44.com/images/public/69e1001a5f1c0bc3344169f5/9143c5b71_Gemini_Generated_Image_gon5mugon5mugon5.png',
        });
      }
    });

    return () => unsubscribe();
  }, [user, queryClient]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ created_by: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const refresh = useCallback(() =>
    queryClient.invalidateQueries({ queryKey: ['my-orders', user?.email] }),
    [queryClient, user?.email]
  );

  const { pulling, progress } = usePullToRefresh(refresh);
  const tabOrders = activeTab === 'reviewed'
    ? orders.filter(isFullyReviewed)
    : orders.filter(o => o.status === activeTab && !isFullyReviewed(o));

  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator progress={progress} pulling={pulling} />
      <Navbar />
      <main className="pt-14 pb-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold mb-1">My Orders</h1>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-6">Track your purchases</p>

          {/* Status tabs */}
          <div className="flex gap-1 mb-8 border-b border-border overflow-x-auto pb-0">
            {STATUSES.map(s => {
              const count = s === 'reviewed'
                ? orders.filter(isFullyReviewed).length
                : orders.filter(o => o.status === s && !isFullyReviewed(o)).length;
              return (
                <button
                  key={s}
                  onClick={() => setActiveTab(s)}
                  className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === s
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 border font-bold ${activeTab === s ? statusColors[s] : 'text-muted-foreground border-border'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1,2].map(i => (
                <div key={i} className="bg-card border border-border p-6 animate-pulse">
                  <div className="h-4 bg-secondary w-1/3 mb-4" />
                  <div className="h-14 bg-secondary" />
                </div>
              ))}
            </div>
          ) : tabOrders.length === 0 ? (
            <div className="text-center py-24 space-y-3">
              <Package className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="font-mono text-muted-foreground text-sm">NO {activeTab.toUpperCase()} ORDERS</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tabOrders.map(order => (
                <OrderCard key={order.id} order={order} onRefresh={refresh} />
              ))}
            </div>
          )}


        </div>
      </main>
    </div>
  );
}