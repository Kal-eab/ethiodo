import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, Star, Upload, X, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '@/components/store/Navbar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

    // Create review
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

    // Remove this item from the order's items list (mark as reviewed/hidden)
    const updatedItems = order.items.map(i =>
      i.product_id === item.product_id ? { ...i, removed: true } : i
    );
    await base44.entities.Order.update(order.id, { items: updatedItems });

    toast.success('Review submitted! The product has been removed from your list.');
    setSubmitting(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
                <button key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => setRating(i)}>
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

          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="w-full h-11 bg-primary text-primary-foreground font-mono font-bold hover:bg-primary/90"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            SUBMIT REVIEW & REMOVE
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Single order item row ────────────────────────────────────────────────────
function OrderItemRow({ item, order, isDelivered, onReviewed }) {
  const [showModal, setShowModal] = useState(false);

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
          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30 font-mono text-xs h-8 flex-shrink-0"
          >
            Review & Remove
          </Button>
        )}
      </div>

      {showModal && (
        <ReviewRemoveModal
          item={item}
          order={order}
          onClose={() => setShowModal(false)}
          onDone={() => { setShowModal(false); onReviewed(); }}
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

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ created_by: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['my-orders', user?.email] });

  const tabOrders = orders.filter(o => o.status === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
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

          {activeTab === 'delivered' && tabOrders.length > 0 && (
            <p className="font-mono text-[11px] text-muted-foreground text-center mt-6">
              To remove a delivered item, click "Review &amp; Remove" and submit a review with photos.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}