import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Clock, CheckCircle2, Package, Trash2, DollarSign, Truck, Upload, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import OrderDetailDrawer from '@/components/admin/OrderDetailDrawer';

const TABS = [
  { key: 'pending',   label: 'Pending',   icon: Clock,         color: 'text-yellow-400', border: 'border-yellow-400' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2,  color: 'text-blue-400',   border: 'border-blue-400' },
  { key: 'shipped',   label: 'Shipped',   icon: Truck,         color: 'text-purple-400', border: 'border-purple-400' },
  { key: 'delivered', label: 'Delivered', icon: Package,       color: 'text-accent',     border: 'border-accent' },
];

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

export default function AdminOrders() {
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [shipTarget, setShipTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 200),
  });

  const handleDelete = async (orderId) => {
    if (!window.confirm('Delete this fake order?')) return;
    await base44.entities.Order.delete(orderId);
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    toast.success('Order deleted');
  };

  const handleMoneyReceived = async (order) => {
    // Calculate profit from items (use product profit if set, otherwise full price)
    let profit = 0;
    for (const item of order.items || []) {
      const products = await base44.entities.Product.filter({ id: item.product_id });
      const product = products[0];
      const perUnit = (product?.profit != null) ? product.profit : (item.price || 0);
      profit += perUnit * (item.quantity || 1);
    }
    await base44.entities.Order.update(order.id, {
      money_received: true,
      money_received_date: new Date().toISOString(),
      profit_recorded: profit,
    });
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    toast.success('Revenue recorded!');
  };

  const sendStatusMessage = async (order, newStatus, shippedPhotoUrl) => {
    const conversationId = order.customer_email;
    if (!conversationId) return;

    const statusMessages = {
      confirmed: `✅ Great news! Your order #${order.id?.slice(-8).toUpperCase()} has been **confirmed**. We're preparing your items now.`,
      shipped:   `📦 Your order #${order.id?.slice(-8).toUpperCase()} has been **shipped**! Check the photo of your packaged items below. We'll notify you when it arrives.`,
      delivered: `🎉 Your order #${order.id?.slice(-8).toUpperCase()} has been **delivered**! Thank you for shopping with us. Please leave a review in your Orders page.`,
    };

    const content = statusMessages[newStatus];
    if (!content) return;

    await base44.entities.Message.create({
      conversation_id: conversationId,
      user_email: order.customer_email,
      user_name: order.customer_name || order.customer_email,
      content,
      image_url: newStatus === 'shipped' ? shippedPhotoUrl : null,
      sender: 'admin',
      is_read: false,
    });
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
      for (const item of order.items || []) {
        const products = await base44.entities.Product.filter({ id: item.product_id });
        if (products[0]) {
          await base44.entities.Product.update(item.product_id, {
            totalPurchases: (products[0].totalPurchases || 0) + (item.quantity || 1),
          });
        }
      }
    }

    await base44.entities.Order.update(orderId, updates);
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

  const STATUS_ORDER = { pending: 0, confirmed: 1, shipped: 2, delivered: 3 };

  const filtered = orders
    .filter(o => {
      if (o.status !== activeTab) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_email?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));

  const countByStatus = (status) => orders.filter(o => o.status === status).length;

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
          No {activeTab} orders
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
                  <span className="text-sm font-semibold truncate">{order.customer_name || order.customer_email}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                  <span>{order.items?.length || 0} item(s)</span>
                  <span className="text-primary font-bold">${order.total?.toFixed(2)}</span>
                  <span>{order.created_date ? format(new Date(order.created_date), 'MMM d, HH:mm') : '—'}</span>
                </div>
              </div>

              {/* Quick action buttons */}
              <div onClick={e => e.stopPropagation()} className="flex items-center gap-2">
                {order.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(order.id, 'confirmed')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-400/10 border border-blue-400/30 text-blue-400 font-mono text-xs uppercase hover:bg-blue-400/20 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 border border-destructive/30 text-destructive font-mono text-xs uppercase hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
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
                {order.status === 'delivered' && !order.money_received && (
                  <button
                    onClick={() => handleMoneyReceived(order)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary font-mono text-xs uppercase hover:bg-primary/20 transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Money Received
                  </button>
                )}
                {order.status === 'delivered' && order.money_received && (
                  <span className="font-mono text-xs text-primary px-2 py-1 border border-primary/20 bg-primary/5">
                    ✓ Recorded
                  </span>
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
      />

      {shipTarget && (
        <ShipModal
          order={shipTarget}
          onClose={() => setShipTarget(null)}
          onShipped={handleShipped}
        />
      )}
    </div>
  );
}