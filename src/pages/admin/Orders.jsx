import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Clock, CheckCircle2, Package, Trash2, DollarSign, Truck, Upload, Loader2, X, Wallet, BellRing, FlaskConical } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import OrderDetailDrawer from '@/components/admin/OrderDetailDrawer';
import { FINAL_PAYMENT, finalAmount, finalAmountDue, isFinalPaymentOpen } from '@/lib/orderPayment';
import { isTestOrder, TEST_BADGE_CLASS } from '@/lib/testMode';

// The first four tabs filter on `order.status`; "Final Payment" is a cross-cut
// queue of delivered orders whose remaining 90% is still open (see lib/orderPayment).
const FINAL_PAYMENT_TAB = 'final_payment';

const TABS = [
  { key: 'pending',   label: 'Pending',   icon: Clock,         color: 'text-yellow-400', border: 'border-yellow-400' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2,  color: 'text-blue-400',   border: 'border-blue-400' },
  { key: 'shipped',   label: 'Shipped',   icon: Truck,         color: 'text-purple-400', border: 'border-purple-400' },
  { key: 'delivered', label: 'Delivered', icon: Package,       color: 'text-accent',     border: 'border-accent' },
  { key: FINAL_PAYMENT_TAB, label: 'Final Payment', icon: Wallet, color: 'text-primary', border: 'border-primary' },
];

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

const STATUS_ORDER = { pending: 0, confirmed: 1, shipped: 2, delivered: 3 };

const STATUS_ROW_STYLE = {
  pending:   'border-l-2 border-l-yellow-400/60',
  confirmed: 'border-l-2 border-l-blue-400/60',
  shipped:   'border-l-2 border-l-purple-400/60',
  delivered: 'border-l-2 border-l-accent/60',
};

// ─── Ship modal: upload photo then mark as shipped ────────────────────────────
function ShipModal({ order, onClose, onShipped }) {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!photoUrl) { toast.error('Please upload a photo first'); return; }
    setSubmitting(true);
    await onShipped(order, photoUrl);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase">Mark as Shipped</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-muted-foreground">Upload a photo of the packaged product before marking as shipped.</p>

        {preview ? (
          <div className="relative">
            <img src={preview} alt="package" className="w-full h-48 object-cover border border-border" />
            <button onClick={() => { setPreview(null); setPhotoUrl(null); }}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-0.5 rounded">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-36 border border-dashed border-border bg-secondary/40 cursor-pointer hover:border-primary/50 transition-colors gap-2">
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
            <span className="font-mono text-xs text-muted-foreground">{uploading ? 'Uploading…' : 'Click to upload photo'}</span>
          </label>
        )}

        <button
          onClick={handleSubmit}
          disabled={!photoUrl || submitting}
          className="w-full h-10 bg-purple-500 text-white font-mono text-xs uppercase font-bold hover:bg-purple-500/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
          Confirm Shipped
        </button>
      </div>
    </div>
  );
}

// ─── Final payment review: the customer's 90% proof, accept or ask again ──────
function FinalPaymentModal({ order, onClose, onConfirm, onRequestAgain }) {
  const [busy, setBusy] = useState(false);
  const proofs = order.final_payment_screenshots || [];
  const due = finalAmountDue(order);

  const run = async (action) => {
    setBusy(true);
    try {
      await action(order);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase">Final Payment Proof</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="bg-secondary/50 border border-border p-3 space-y-1">
          <p className="text-sm"><strong>Customer:</strong> {order.customer_name || order.customer_email}</p>
          <p className="text-sm"><strong>Items:</strong> {(order.items || []).map(i => i.product_name).join(', ') || '—'}</p>
          <p className="text-sm"><strong>Expected:</strong> <span className="font-mono text-primary font-bold">{fmt(due)} Birr</span> (90%)</p>
          <p className="font-mono text-xs text-muted-foreground">
            Sent {order.final_payment_submitted_date ? format(new Date(order.final_payment_submitted_date), 'MMM d, yyyy · HH:mm') : '—'}
          </p>
        </div>

        {proofs.length > 0 ? (
          <div className="space-y-2">
            {proofs.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={url}
                  alt={`Final payment proof ${i + 1}`}
                  className="w-full border border-border object-contain max-h-72 bg-secondary/30 hover:opacity-90 transition-opacity cursor-zoom-in"
                />
              </a>
            ))}
          </div>
        ) : (
          <p className="font-mono text-xs text-muted-foreground py-6 text-center">
            The customer hasn't sent a screenshot yet.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => run(onConfirm)}
            disabled={busy || proofs.length === 0}
            className="w-full h-10 bg-primary text-primary-foreground font-mono text-xs uppercase font-bold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            Received Money
          </button>
          <button
            onClick={() => run(onRequestAgain)}
            disabled={busy}
            className="w-full h-10 border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 font-mono text-xs uppercase flex items-center justify-center gap-2 hover:bg-yellow-400/20 disabled:opacity-50 transition-colors"
          >
            <BellRing className="w-4 h-4" /> Request Payment Again
          </button>
          <button onClick={onClose} className="w-full h-10 border border-border font-mono text-xs uppercase text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [shipTarget, setShipTarget] = useState(null);
  const [finalPaymentTarget, setFinalPaymentTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 200),
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['all-referrals'],
    queryFn: () => base44.entities.CustomerReferral.list('-date_created', 1000),
  });

  const { data: links = [] } = useQuery({
    queryKey: ['creator-product-links'],
    queryFn: () => base44.entities.CreatorProductLink.list('-date_created', 500),
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['creators'],
    queryFn: () => base44.entities.Creator.list('-date_added', 200),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'admin'],
    queryFn: () => base44.entities.Product.filter({}, '-created_date', 500),
  });

  // Memoized — these can be up to 1000 entries each, and without useMemo they
  // were rebuilt on every keystroke of the search box.
  const referralMap = useMemo(() => Object.fromEntries(referrals.map(r => [r.id, r])), [referrals]);
  const linkMap = useMemo(() => Object.fromEntries(links.map(l => [l.id, l])), [links]);
  const creatorMap = useMemo(() => Object.fromEntries(creators.map(c => [c.id, c])), [creators]);
  const productMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);

  const handleDelete = async (orderId) => {
    if (!window.confirm('Delete this fake order?')) return;
    await base44.entities.Order.delete(orderId);
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    toast.success('Order deleted');
  };

  const sendCustomerMessage = async (order, content, imageUrl) => {
    if (!order.customer_email) return;
    await base44.entities.Message.create({
      conversation_id: order.customer_email,
      user_email: order.customer_email,
      user_name: order.customer_name || order.customer_email,
      content,
      image_url: imageUrl || null,
      sender: 'admin',
      is_read: false,
    });
  };

  // Fetches every product on an order in one request, keyed by id. The callers
  // below used to query per line item, so confirming a 10-item order meant ten
  // sequential round-trips before anything was written.
  const fetchOrderProducts = async (order) => {
    const ids = [...new Set((order.items || []).map(i => i.product_id).filter(Boolean))];
    if (ids.length === 0) return {};
    const products = await base44.entities.Product.filter({ id: { in: ids } }, undefined, ids.length);
    return Object.fromEntries(products.map(p => [p.id, p]));
  };

  // Confirms the customer's final 90% payment: the order is now fully paid, so
  // this is also the point where the sale's profit is booked into revenue.
  const handleMoneyReceived = async (order) => {
    // Calculate profit from items (use product profit if set, otherwise full price)
    const productById = await fetchOrderProducts(order);
    let profit = 0;
    for (const item of order.items || []) {
      const product = productById[item.product_id];
      const perUnit = (product?.profit != null) ? product.profit : (item.price || 0);
      profit += perUnit * (item.quantity || 1);
    }
    const now = new Date().toISOString();
    await base44.entities.Order.update(order.id, {
      money_received: true,
      money_received_date: now,
      profit_recorded: profit,
      final_payment_status: FINAL_PAYMENT.PAID,
      final_payment_confirmed_date: now,
    });

    await sendCustomerMessage(
      order,
      `✅ We've received your final payment of **${fmt(finalAmountDue(order))} Birr**. Order #${order.id?.slice(-8).toUpperCase()} is now fully paid — thank you!`
    );

    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    if (selectedOrder?.id === order.id) setSelectedOrder(null);
    toast.success('Payment confirmed — revenue recorded!');
  };

  // Sends the customer back to the upload step (e.g. the screenshot was
  // unreadable or the amount didn't match).
  const handleRequestPaymentAgain = async (order) => {
    await base44.entities.Order.update(order.id, {
      final_payment_status: FINAL_PAYMENT.AWAITING_PAYMENT,
      final_payment_requested_date: new Date().toISOString(),
    });
    await sendCustomerMessage(
      order,
      `⚠️ We couldn't confirm your payment screenshot for order #${order.id?.slice(-8).toUpperCase()}. Please re-send proof of the **${fmt(finalAmountDue(order))} Birr** transfer from your Orders page.`
    );
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    toast.success('Payment re-requested');
  };

  const sendStatusMessage = async (order, newStatus, shippedPhotoUrl) => {
    const statusMessages = {
      confirmed: `✅ Great news! Your order #${order.id?.slice(-8).toUpperCase()} has been **confirmed**. We're preparing your items now.`,
      shipped:   `📦 Your order #${order.id?.slice(-8).toUpperCase()} has been **shipped**! Check the photo of your packaged items below. We'll notify you when it arrives.`,
      delivered: `🎉 Your order #${order.id?.slice(-8).toUpperCase()} has been **delivered**! Please send the remaining **${fmt(finalAmount(order.total))} Birr** (90%) from your Orders page to complete the purchase, then leave us a review.`,
    };

    const content = statusMessages[newStatus];
    if (!content) return;

    await sendCustomerMessage(order, content, newStatus === 'shipped' ? shippedPhotoUrl : null);
  };

  const handleStatusChange = async (orderId, newStatus, shippedPhotoUrl) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updates = { status: newStatus };
    if (newStatus === 'confirmed') updates.confirmed_date = new Date().toISOString();
    if (newStatus === 'shipped') {
      updates.shipped_date = new Date().toISOString();
      if (shippedPhotoUrl) updates.shipped_photo_url = shippedPhotoUrl;
    }
    if (newStatus === 'delivered') {
      updates.delivered_date = new Date().toISOString();
      // Delivery opens the second payment stage: the customer now owes the
      // remaining 90% (see src/lib/orderPayment.js). Already-settled orders
      // (e.g. re-marked delivered) keep their paid state.
      if (order.final_payment_status !== FINAL_PAYMENT.PAID && !order.money_received) {
        updates.final_payment_status = FINAL_PAYMENT.AWAITING_PAYMENT;
        updates.final_payment_amount = finalAmount(order.total);
        updates.final_payment_requested_date = updates.delivered_date;
      }
      // A test order must not move a product's purchase count — that count
      // feeds the popularity/trending scores that order the storefront.
      if (!isTestOrder(order)) {
        const productById = await fetchOrderProducts(order);
        // Sum the quantities per product before writing. The same product can
        // sit on two line items, and one update per line would read the same
        // starting count twice and lose the first increment.
        const boughtQty = {};
        for (const item of order.items || []) {
          if (!item.product_id) continue;
          boughtQty[item.product_id] = (boughtQty[item.product_id] || 0) + (item.quantity || 1);
        }
        await Promise.all(
          Object.entries(boughtQty).map(([productId, qty]) => {
            const product = productById[productId];
            if (!product) return null;
            return base44.entities.Product.update(productId, {
              totalPurchases: (product.totalPurchases || 0) + qty,
            });
          })
        );
      }
    }

    await base44.entities.Order.update(orderId, updates);

    // ── Creator referral: confirm & increment counts on order confirmation ──
    if (newStatus === 'confirmed' && order.matched_referral_id) {
      try {
        const referral = await base44.entities.CustomerReferral.filter({ id: order.matched_referral_id });
        if (referral[0] && referral[0].status !== 'confirmed') {
          await base44.entities.CustomerReferral.update(order.matched_referral_id, { status: 'confirmed' });
          const linkId = referral[0].creator_product_link_id;
          const links = await base44.entities.CreatorProductLink.filter({ id: linkId });
          if (links[0]) {
            const link = links[0];
            await base44.entities.CreatorProductLink.update(linkId, {
              confirmed_order_count: (link.confirmed_order_count || 0) + 1,
              total_confirmed_sales: (link.total_confirmed_sales || 0) + (order.total || 0),
            });
          }
        }
      } catch {} // silently ignore referral count failures
    }

    // Send message notification to customer
    await sendStatusMessage({ ...order, ...updates }, newStatus, shippedPhotoUrl);
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    toast.success(`Order marked as ${newStatus}`);

    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, ...updates });
    }
  };

  const handleShipped = async (order, photoUrl) => {
    await handleStatusChange(order.id, 'shipped', photoUrl);
  };

  const filtered = useMemo(() => orders
    .filter(o => {
      const inTab = activeTab === FINAL_PAYMENT_TAB ? isFinalPaymentOpen(o) : o.status === activeTab;
      if (!inTab) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_email?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)),
  [orders, activeTab, search]);

  // One pass over orders instead of one .filter() per tab per render.
  const statusCounts = useMemo(() => {
    const counts = {};
    for (const o of orders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
      if (isFinalPaymentOpen(o)) counts[FINAL_PAYMENT_TAB] = (counts[FINAL_PAYMENT_TAB] || 0) + 1;
    }
    return counts;
  }, [orders]);
  const countByStatus = (status) => statusCounts[status] || 0;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-lg font-bold uppercase tracking-wider">Orders</h1>
        <Link
          to="/admin/revenue"
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 text-primary font-mono text-xs uppercase hover:bg-primary/20 transition-colors"
        >
          <DollarSign className="w-3.5 h-3.5" /> View Revenue
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const count = countByStatus(tab.key);
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs uppercase transition-colors border-b-2 -mb-px ${
                active ? `${tab.color} ${tab.border}` : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full ${active ? 'bg-foreground/10' : 'bg-muted'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-secondary border border-border px-3 py-2 max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by name, email, or ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
        />
      </div>

      {/* Order list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-secondary animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground font-mono text-sm">
          {activeTab === FINAL_PAYMENT_TAB
            ? 'All orders paid in full!'
            : `No ${activeTab} orders`}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={`bg-card border border-border p-4 cursor-pointer hover:border-foreground/30 transition-colors flex items-center gap-4 ${STATUS_ROW_STYLE[order.status]}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground">#{order.id?.slice(-8).toUpperCase()}</span>
                  {isTestOrder(order) && (
                    <span className={TEST_BADGE_CLASS}><FlaskConical className="w-2.5 h-2.5" /> Test</span>
                  )}
                  <span className="text-sm font-semibold truncate">{order.customer_name || order.customer_email}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                  <span>{order.items?.length || 0} item(s)</span>
                  <span className="text-primary font-bold">${order.total?.toFixed(2)}</span>
                  <span>{order.created_date ? format(new Date(order.created_date), 'MMM d, HH:mm') : '—'}</span>
                </div>
              </div>

              {/* Referral Match badge */}
              <div className="hidden sm:block flex-shrink-0">
                {(() => {
                  if (!order.matched_referral_id) return null;
                  const ref = referralMap[order.matched_referral_id];
                  if (!ref) return null;
                  const link = linkMap[ref.creator_product_link_id];
                  const creator = link ? creatorMap[link.creator_id] : null;
                  const product = productMap[ref.product_id];
                  return (
                    <span className="font-mono text-[10px] whitespace-nowrap px-2 py-1 border border-purple-400/30 bg-purple-400/5 text-purple-400">
                      {creator?.name || 'Creator'} · {product?.name || 'Product'}
                    </span>
                  );
                })()}
              </div>

              {/* Quick action buttons */}
              <div onClick={e => e.stopPropagation()} className="flex flex-col items-end gap-1.5">
                {order.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange(order.id, 'confirmed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-400/10 border border-blue-400/30 text-blue-400 font-mono text-xs uppercase hover:bg-blue-400/20 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                  </button>
                )}
                {order.status === 'confirmed' && (
                  <button
                    onClick={() => setShipTarget(order)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-400/10 border border-purple-400/30 text-purple-400 font-mono text-xs uppercase hover:bg-purple-400/20 transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" /> Ship
                  </button>
                )}
                {order.status === 'shipped' && (
                  <button
                    onClick={() => handleStatusChange(order.id, 'delivered')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/30 text-accent font-mono text-xs uppercase hover:bg-accent/20 transition-colors"
                  >
                    <Package className="w-3.5 h-3.5" /> Delivered
                  </button>
                )}
                {/* Customer sent the 90% proof — review it before booking revenue. */}
                {order.final_payment_status === FINAL_PAYMENT.AWAITING_CONFIRMATION && (
                  <button
                    onClick={() => setFinalPaymentTarget(order)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary font-mono text-xs uppercase hover:bg-primary/20 transition-colors"
                  >
                    <Wallet className="w-3.5 h-3.5" /> View Proof — {fmt(finalAmountDue(order))} Birr
                  </button>
                )}
                {order.final_payment_status === FINAL_PAYMENT.AWAITING_PAYMENT && (
                  <button
                    onClick={() => handleRequestPaymentAgain(order)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-mono text-xs uppercase hover:bg-yellow-400/20 transition-colors"
                  >
                    <BellRing className="w-3.5 h-3.5" /> Remind — {fmt(finalAmountDue(order))} Birr due
                  </button>
                )}
                {/* Orders delivered before the two-stage flow existed have no
                    payment stage — keep the original one-click revenue button. */}
                {order.status === 'delivered' && !order.final_payment_status && !order.money_received && (
                  <button
                    onClick={() => handleMoneyReceived(order)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary font-mono text-xs uppercase hover:bg-primary/20 transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Money Received
                  </button>
                )}
                {order.status === 'delivered' && order.money_received && (
                  <span className="font-mono text-xs text-primary px-2 py-1 border border-primary/20 bg-primary/5">
                    ✓ Paid in full
                  </span>
                )}
                {['pending', 'confirmed', 'shipped'].includes(order.status) && (
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 border border-destructive/30 text-destructive font-mono text-xs uppercase hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={handleStatusChange}
        onReviewFinalPayment={setFinalPaymentTarget}
      />

      {shipTarget && (
        <ShipModal
          order={shipTarget}
          onClose={() => setShipTarget(null)}
          onShipped={handleShipped}
        />
      )}

      {finalPaymentTarget && (
        <FinalPaymentModal
          order={finalPaymentTarget}
          onClose={() => setFinalPaymentTarget(null)}
          onConfirm={handleMoneyReceived}
          onRequestAgain={handleRequestPaymentAgain}
        />
      )}
    </div>
  );
}