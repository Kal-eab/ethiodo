import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, Eye } from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '@/components/store/Navbar';
import OrderTimeline from '@/components/store/OrderTimeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Orders() {
  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold mb-2">My Orders</h1>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-8">
            Track your purchases
          </p>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card border border-border p-6 animate-pulse">
                  <div className="h-4 bg-secondary w-1/4 mb-4" />
                  <div className="h-10 bg-secondary" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-24 space-y-4">
              <Package className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="font-mono text-muted-foreground text-sm">NO ORDERS YET</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div
                  key={order.id}
                  className="bg-card border border-border p-6 hover:border-primary/20 transition-colors cursor-pointer"
                  onClick={() => setSelected(order)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">
                        ORDER #{order.id?.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy • HH:mm') : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xl font-bold text-primary">
                        ${order.total?.toFixed(2)}
                      </span>
                      <button className="text-muted-foreground hover:text-foreground">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <OrderTimeline status={order.status} />
                  {/* Items preview */}
                  <div className="mt-4 flex gap-2 overflow-x-auto">
                    {order.items?.slice(0, 4).map((item, i) => (
                      <div key={i} className="w-12 h-12 bg-secondary border border-border flex-shrink-0 overflow-hidden">
                        {item.product_image && (
                          <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                    {order.items?.length > 4 && (
                      <div className="w-12 h-12 bg-secondary border border-border flex items-center justify-center">
                        <span className="font-mono text-xs text-muted-foreground">+{order.items.length - 4}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Order detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              ORDER #{selected?.id?.slice(-8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <OrderTimeline status={selected.status} />
              <div className="border-t border-border pt-4 space-y-2">
                {selected.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
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
              <div className="border-t border-border pt-4 flex justify-between">
                <span className="font-mono text-sm uppercase">Total</span>
                <span className="font-mono text-xl font-bold text-primary">${selected.total?.toFixed(2)}</span>
              </div>
              {selected.payment_proof_url && (
                <div className="border-t border-border pt-4">
                  <p className="font-mono text-xs text-muted-foreground uppercase mb-2">Payment Proof</p>
                  <img src={selected.payment_proof_url} alt="Proof" className="max-h-48 border border-border" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}