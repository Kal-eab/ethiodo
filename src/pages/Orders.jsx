import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, Star, Upload, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/store/PullToRefreshIndicator';

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered'];

const statusColors = {
  pending: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  confirmed: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
  shipped: 'text-primary border-primary/30 bg-primary/5',
  delivered: 'text-accent border-accent/30 bg-accent/5',
};

// ─── Review & Remove Modal ────────────────────────────────────────────────────
function ReviewRemoveModal({ item, order, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    const prevs = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
      prevs.push(URL.createObjectURL(file));
    }
    setPhotos(p => [...p, ...urls]);
    setPreviews(p => [...p, ...prevs]);
    setUploading(false);
  };

  const removePhoto = (idx) => {
    setPhotos(p => p.filter((_, i) => i !== idx));
    setPreviews(p => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!rating) { toast.error('Please select a star rating'); return; }
    if (body.trim().length < 10) { toast.error('Please write a review (at least 10 characters)'); return; }
    if (photos.length === 0) { toast.error('Please add at least one photo'); return; }
    setSubmitting(true);
    try {
      await base44.entities.Review.create({
        product_id: item.product_id,
        order_id: order.id,
        rating,
        body: body.trim(),
        photos,
        reviewer_name: order.customer_name || '',
        reviewer_email: order.customer_email || '',
        verified_buyer: true,
        status: 'pending',
      });

      const updatedItems = (order.items || []).map(orderItem =>
        orderItem.product_id === item.product_id ? { ...orderItem, removed: true } : orderItem
      );
      await base44.entities.Order.update(order.id, { items: updatedItems });

      toast.success('Review submitted! Product removed from your list.');
      onDone();
    } catch (err) {
      toast.error('Something went wrong: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={e => e.stopPropagation()}>
      <div className="bg-card border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-base">Review & Remove</h2>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">{item.product_name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-muted-foreground">
            To remove this product from your delivered list, please leave a review with a rating, text, and at least one photo.
            Your review will be visible to other customers!
          </p>

          {/* Star rating */}
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase mb-2">Your Rating *</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <button type="button" key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRating(i); }}>
                  <Star className={`w-7 h-7 transition-colors ${i <= (hover || rating) ? 'fill-primary text-primary' : 'text-border'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Review text */}
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase mb-2">Your Review *</p>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Share your experience with this product..."
              rows={4}
              className="w-full bg-secondary border border-border px-4 py-3 text-sm outline-none placeholder:text-muted-foreground resize-none focus:border-primary/50 transition-colors"
            />
            <p className="font-mono text-[10px] text-muted-foreground mt-1">{body.length} chars (min 10)</p>
          </div>

          {/* Photo upload */}
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase mb-2">Photos * (required)</p>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative w-20 h-20 border border-border overflow-hidden">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(i)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors gap-1">
                <input type="file" accept="image/*,video/*" multiple onChange={handleFiles} className="hidden" />
                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                <span className="font-mono text-[9px] text-muted-foreground">ADD</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="w-full h-11 bg-primary text-primary-foreground font-mono font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            SUBMIT REVIEW & REMOVE
          </button>
        </div>
      </div>
    </div>
  );
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
  const [removed, setRemoved] = useState(false);

  const { data: itemReviews = [] } = useQuery({
    queryKey: ['order-item-reviews', item.product_id, order.id],
    queryFn: () => base44.entities.Review.filter({ product_id: item.product_id, status: 'approved' }, '-created_date', 5),
    enabled: isDelivered && !!item.product_id,
  });

  if (removed) return null;

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
          <button
            onClick={() => setShowModal(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold border border-primary/40 text-primary bg-primary/5 hover:bg-primary/15 transition-colors"
          >
            <Star className="w-3 h-3" /> Review & Remove
          </button>
        )}
      </div>

      {/* Inline reviews below delivered item */}
      {isDelivered && itemReviews.length > 0 && (
        <div className="mb-3 space-y-2 border-l-2 border-primary/20 pl-3 ml-1">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Customer Reviews</p>
          {itemReviews.map(review => (
            <div key={review.id} className="bg-secondary/40 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                  {(review.reviewer_name || 'A')[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold">{review.reviewer_name || 'Anonymous'}</span>
                {review.verified_buyer && <span className="font-mono text-[9px] text-accent border border-accent/30 px-1 py-0.5">✓ Verified</span>}
                <div className="flex gap-0.5 ml-auto">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'fill-primary text-primary' : 'text-border'}`} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{review.body}</p>
              {review.photos?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {review.photos.slice(0, 3).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" className="w-14 h-14 object-cover border border-border hover:opacity-80 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ReviewRemoveModal
          item={item}
          order={order}
          onClose={() => setShowModal(false)}
          onDone={() => {
            setShowModal(false);
            setRemoved(true);
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
    </div>
  );
}

// ─── Main Orders page ─────────────────────────────────────────────────────────
export default function Orders() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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
          icon: 'https://media.base44.com/images/public/69e1001a5f1c0bc3344169f5/6811e703c_Gemini_Generated_Image_olhtx9olhtx9olht.png',
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
  const tabOrders = orders.filter(o => o.status === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="My Orders" />
      <PullToRefreshIndicator progress={progress} pulling={pulling} />
      <Navbar />
      <main className="pt-16 pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold mb-1">My Orders</h1>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-6">Track your purchases</p>

          {/* Status tabs */}
          <div className="flex gap-1 mb-8 border-b border-border overflow-x-auto pb-0">
            {STATUSES.map(s => {
              const count = orders.filter(o => o.status === s).length;
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