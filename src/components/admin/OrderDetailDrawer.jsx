import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ImageIcon, CheckCircle2, Package, Clock } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/30',   icon: CheckCircle2 },
  delivered: { label: 'Delivered', color: 'text-accent',     bg: 'bg-accent/10',     border: 'border-accent/30',     icon: Package },
};

export default function OrderDetailDrawer({ order, onClose, onStatusChange }) {
  if (!order) return null;

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <Sheet open={!!order} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-mono text-sm flex items-center gap-2">
            ORDER #{order.id?.slice(-8).toUpperCase()}
            <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
              <Icon className="w-3 h-3" /> {cfg.label}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Lifecycle timestamps */}
          <div className="bg-secondary/40 border border-border p-4 space-y-2">
            <p className="font-mono text-xs text-muted-foreground uppercase mb-3">Order Lifecycle</p>
            <TimelineRow label="Placed" date={order.created_date} active />
            <TimelineRow label="Confirmed" date={order.confirmed_date} active={!!order.confirmed_date} />
            <TimelineRow label="Delivered" date={order.delivered_date} active={!!order.delivered_date} />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {order.status === 'pending' && (
              <button
                onClick={() => onStatusChange(order.id, 'confirmed')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-400/10 border border-blue-400/30 text-blue-400 font-mono text-xs uppercase hover:bg-blue-400/20 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm Order
              </button>
            )}
            {order.status === 'confirmed' && (
              <button
                onClick={() => onStatusChange(order.id, 'delivered')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent/10 border border-accent/30 text-accent font-mono text-xs uppercase hover:bg-accent/20 transition-colors"
              >
                <Package className="w-4 h-4" /> Mark as Delivered
              </button>
            )}
          </div>

          {/* Customer */}
          <div className="bg-secondary/50 border border-border p-4 space-y-2">
            <p className="font-mono text-xs text-muted-foreground uppercase mb-2">Customer</p>
            <p className="text-sm"><strong>Name:</strong> {order.customer_name || '—'}</p>
            <p className="text-sm"><strong>Email:</strong> {order.customer_email || '—'}</p>
            <p className="text-sm"><strong>Phone:</strong> {order.phone || '—'}</p>
            <p className="text-sm"><strong>Address:</strong> {order.shipping_address || '—'}</p>
          </div>

          {/* Items */}
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase mb-3">Items</p>
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-secondary/50 border border-border p-2">
                  <div className="w-10 h-10 bg-secondary overflow-hidden flex-shrink-0">
                    {item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.product_name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      ×{item.quantity}{item.size ? ` · ${item.size}` : ''}
                    </p>
                  </div>
                  <span className="font-mono text-sm">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-border">
              <span className="font-mono text-sm uppercase font-bold">Total</span>
              <span className="font-mono text-xl font-bold text-primary">${order.total?.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Screenshot */}
          {order.payment_proof_url && (
            <div>
              <p className="font-mono text-xs text-muted-foreground uppercase mb-3 flex items-center gap-2">
                <ImageIcon className="w-3 h-3" /> Payment Screenshot
              </p>
              <a href={order.payment_proof_url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={order.payment_proof_url}
                  alt="Payment screenshot"
                  className="w-full border border-border object-contain max-h-80 bg-secondary/30 hover:opacity-90 transition-opacity cursor-zoom-in"
                />
              </a>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">Click image to open full size</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TimelineRow({ label, date, active }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-primary' : 'bg-border'}`} />
      <span className={`font-mono text-xs w-20 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      <span className="font-mono text-xs text-muted-foreground">
        {date ? format(new Date(date), 'MMM d, yyyy · HH:mm') : '—'}
      </span>
    </div>
  );
}