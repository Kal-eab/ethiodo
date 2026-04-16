import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Eye, Image } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import OrderTimeline from '@/components/store/OrderTimeline';

export default function AdminOrders() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ['all-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 200),
  });

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const updateStatus = async (orderId, status) => {
    await base44.entities.Order.update(orderId, { status });
    queryClient.invalidateQueries({ queryKey: ['all-orders'] });
    if (selected?.id === orderId) setSelected({ ...selected, status });
    toast.success(`Order marked as ${status}`);
  };

  const statusColors = {
    pending: 'text-yellow-400 bg-yellow-400/10',
    confirmed: 'text-blue-400 bg-blue-400/10',
    shipped: 'text-purple-400 bg-purple-400/10',
    delivered: 'text-accent bg-accent/10',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">{orders.length} total</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Order</th>
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase hidden sm:table-cell">Customer</th>
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase hidden md:table-cell">Date</th>
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Total</th>
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Status</th>
                <th className="text-right p-3 font-mono text-xs text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="p-3">
                    <span className="font-mono text-xs">#{order.id?.slice(-8).toUpperCase()}</span>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <div>
                      <p className="text-sm">{order.customer_name || '—'}</p>
                      <p className="font-mono text-xs text-muted-foreground">{order.customer_email}</p>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell font-mono text-xs text-muted-foreground">
                    {order.created_date ? format(new Date(order.created_date), 'MMM d, HH:mm') : '—'}
                  </td>
                  <td className="p-3 font-mono font-bold text-primary">${order.total?.toFixed(2)}</td>
                  <td className="p-3">
                    <Select value={order.status} onValueChange={v => updateStatus(order.id, v)}>
                      <SelectTrigger className={`w-32 h-8 text-xs font-mono uppercase border-none ${statusColors[order.status] || ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelected(order)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Drawer */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono text-sm">
              ORDER #{selected?.id?.slice(-8).toUpperCase()}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="space-y-6 mt-6">
              <OrderTimeline status={selected.status} />

              {/* Status control */}
              <div>
                <label className="font-mono text-xs text-muted-foreground uppercase block mb-2">Update Status</label>
                <Select value={selected.status} onValueChange={v => updateStatus(selected.id, v)}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customer details */}
              <div className="bg-secondary/50 border border-border p-4 space-y-2">
                <p className="font-mono text-xs text-muted-foreground uppercase mb-2">Customer</p>
                <p className="text-sm"><strong>Name:</strong> {selected.customer_name || '—'}</p>
                <p className="text-sm"><strong>Email:</strong> {selected.customer_email || '—'}</p>
                <p className="text-sm"><strong>Phone:</strong> {selected.phone || '—'}</p>
                <p className="text-sm"><strong>Address:</strong> {selected.shipping_address || '—'}</p>
              </div>

              {/* Items */}
              <div>
                <p className="font-mono text-xs text-muted-foreground uppercase mb-3">Items</p>
                <div className="space-y-2">
                  {selected.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-secondary/50 border border-border p-2">
                      <div className="w-10 h-10 bg-secondary overflow-hidden flex-shrink-0">
                        {item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.product_name}</p>
                        <p className="font-mono text-xs text-muted-foreground">×{item.quantity}</p>
                      </div>
                      <span className="font-mono text-sm">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 pt-4 border-t border-border">
                  <span className="font-mono text-sm uppercase font-bold">Total</span>
                  <span className="font-mono text-xl font-bold text-primary">${selected.total?.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Proof */}
              {selected.payment_proof_url && (
                <div>
                  <p className="font-mono text-xs text-muted-foreground uppercase mb-3 flex items-center gap-2">
                    <Image className="w-3 h-3" /> Payment Proof
                  </p>
                  <a href={selected.payment_proof_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={selected.payment_proof_url}
                      alt="Payment proof"
                      className="w-full border border-border hover:opacity-80 transition-opacity"
                    />
                  </a>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}