import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ImageIcon, CheckCircle2, Package, Clock, Truck, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { FINAL_PAYMENT, FINAL_PAYMENT_LABELS, depositAmount, finalAmountDue } from '@/lib/orderPayment';
import { formatSelection } from '@/lib/productOptions';

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/30',   icon: CheckCircle2 },
  shipped:   { label: 'Shipped',   color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', icon: Truck },
  delivered: { label: 'Delivered', color: 'text-accent',     bg: 'bg-accent/10',     border: 'border-accent/30',     icon: Package },
};

export default function OrderDetailDrawer({ order, onClose, onStatusChange, onReviewFinalPayment }) {
  if (!order) return null;

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const finalStage = order.final_payment_status;

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
            <TimelineRow label="Shipped" date={order.shipped_date} active={!!order.shipped_date} />
            <TimelineRow label="Delivered" date={order.delivered_date} active={!!order.delivered_date} />
            {finalStage && (
              <>
                <TimelineRow label="90% asked" date={order.final_payment_requested_date} active={!!order.final_payment_requested_date} />
                <TimelineRow label="90% sent" date={order.final_payment_submitted_date} active={!!order.final_payment_submitted_date} />
                <TimelineRow label="Paid" date={order.final_payment_confirmed_date} active={!!order.final_payment_confirmed_date} />
              </>
            )}
          </div>

          {/* Final (90%) payment stage */}
          {finalStage && (
            <div className="border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs uppercase text-primary flex items-center gap-2">
                  <Wallet className="w-3 h-3" /> {FINAL_PAYMENT_LABELS[finalStage] || 'Final Payment'}
                </p>
                <span className="font-mono text-sm font-bold text-primary">{fmt(finalAmountDue(order))} Birr</span>
              </div>
              <p className="font-mono text-[11px] text-muted-foreground">
                Deposit paid: {fmt(depositAmount(order.total))} Birr (10%) · Remaining: {fmt(finalAmountDue(order))} Birr (90%)
              </p>

              {order.final_payment_screenshots?.length > 0 && (
                <div className="space-y-2">
                  {order.final_payment_screenshots.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={url}
                        alt={`Final payment proof ${i + 1}`}
                        className="w-full border border-border object-contain max-h-60 bg-secondary/30 hover:opacity-90 transition-opacity cursor-zoom-in"
                      />
                    </a>
                  ))}
                </div>
              )}

              {finalStage === FINAL_PAYMENT.AWAITING_CONFIRMATION && onReviewFinalPayment && (
                <button
                  onClick={() => onReviewFinalPayment(order)}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-mono text-xs uppercase font-bold hover:bg-primary/90 transition-colors"
                >
                  Review Final Payment
                </button>
              )}
              {finalStage === FINAL_PAYMENT.AWAITING_PAYMENT && (
                <p className="font-mono text-[11px] text-yellow-400">
                  Waiting for the customer to send their payment screenshot.
                </p>
              )}
            </div>
          )}

          {/* Shipped photo */}
          {order.shipped_photo_url && (
            <div>
              <p className="font-mono text-xs text-muted-foreground uppercase mb-2 flex items-center gap-2">
                <Truck className="w-3 h-3" /> Shipped Package Photo
              </p>
              <a href={order.shipped_photo_url} target="_blank" rel="noopener noreferrer">
                <img src={order.shipped_photo_url} alt="Shipped package" className="w-full border border-border object-contain max-h-60 bg-secondary/30 hover:opacity-90 transition-opacity cursor-zoom-in" />
              </a>
            </div>
          )}

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
            {order.status === 'shipped' && (
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
                      ×{item.quantity}{item.options ? ` · ${formatSelection(item.options)}` : item.size ? ` · ${item.size}` : ''}
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

          {/* Payment Screenshots */}
          {(order.payment_proof_screenshots?.length > 0 || order.payment_proof_url) && (
            <div>
              <p className="font-mono text-xs text-muted-foreground uppercase mb-3 flex items-center gap-2">
                <ImageIcon className="w-3 h-3" /> Payment Screenshot{(order.payment_proof_screenshots?.length > 1) ? 's' : ''}
              </p>
              <div className="space-y-3">
                {(order.payment_proof_screenshots?.length > 0
                  ? order.payment_proof_screenshots
                  : [order.payment_proof_url]
                ).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={url}
                      alt={`Payment screenshot ${i + 1}`}
                      className="w-full border border-border object-contain max-h-80 bg-secondary/30 hover:opacity-90 transition-opacity cursor-zoom-in"
                    />
                  </a>
                ))}
              </div>
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