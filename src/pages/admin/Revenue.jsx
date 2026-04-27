import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { DollarSign, Package } from 'lucide-react';

const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

export default function Revenue() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 500),
  });

  const revenueOrders = orders.filter(o => o.money_received);
  const totalRevenue = revenueOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold uppercase tracking-wider">Total Revenue</h1>
        <p className="font-mono text-xs text-muted-foreground mt-1">Orders marked as money received</p>
      </div>

      {/* Total card */}
      <div className="bg-card border border-primary/30 p-6 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, rgba(180,255,0,0.05) 0%, transparent 100%)' }}>
        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</p>
          <p className="font-mono text-3xl font-black text-primary">{fmt(totalRevenue)} <span className="text-base font-normal">Birr</span></p>
          <p className="font-mono text-xs text-muted-foreground mt-1">{revenueOrders.length} confirmed payments</p>
        </div>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-secondary animate-pulse" />)}
        </div>
      ) : revenueOrders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="font-mono text-xs text-muted-foreground uppercase">No revenue recorded yet</p>
          <p className="font-mono text-xs text-muted-foreground mt-1">Mark delivered orders as "Money Received" from the Orders page</p>
        </div>
      ) : (
        <div className="bg-card border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Order</th>
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase hidden sm:table-cell">Customer</th>
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase hidden md:table-cell">Items</th>
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase hidden md:table-cell">Date</th>
                <th className="text-right p-3 font-mono text-xs text-muted-foreground uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {revenueOrders.map(order => (
                <tr key={order.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="p-3">
                    <p className="font-mono text-xs text-muted-foreground">#{order.id?.slice(-8).toUpperCase()}</p>
                    <p className="text-sm font-medium sm:hidden truncate max-w-[140px]">{order.customer_name || order.customer_email}</p>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <p className="text-sm font-medium">{order.customer_name || '—'}</p>
                    <p className="font-mono text-xs text-muted-foreground">{order.customer_email}</p>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <p className="text-sm text-muted-foreground">{(order.items || []).map(i => i.product_name).join(', ')}</p>
                  </td>
                  <td className="p-3 hidden md:table-cell font-mono text-xs text-muted-foreground">
                    {order.money_received_date ? format(new Date(order.money_received_date), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="p-3 text-right font-mono font-black text-primary text-base">
                    {fmt(order.total)} <span className="text-xs font-normal">Birr</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-primary/30 bg-primary/5">
                <td colSpan={4} className="p-3 font-mono text-sm font-bold uppercase">Total</td>
                <td className="p-3 text-right font-mono font-black text-primary text-lg">
                  {fmt(totalRevenue)} <span className="text-sm font-normal">Birr</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}