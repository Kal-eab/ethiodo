import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, ShoppingCart, DollarSign, Clock, Trash2, Loader2, FlaskConical } from 'lucide-react';
import CustomerAnalytics from '@/components/admin/CustomerAnalytics';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { isTestProduct, isTestOrder, realOrders, testOrders, TEST_BADGE_CLASS } from '@/lib/testMode';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card border border-border p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={`font-mono text-3xl font-bold mt-2 ${color || 'text-foreground'}`}>{value}</p>
        </div>
        <div className="w-10 h-10 bg-secondary flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [resetting, setResetting] = useState(false);
  const queryClient = useQueryClient();

  const handleResetTestData = async () => {
    if (!window.confirm('⚠️ This will permanently delete ALL orders, reviews, messages, notifications, and contact requests. Products will be kept. Are you sure?')) return;
    setResetting(true);
    try {
      const [orders, reviews, messages, notifications, requests] = await Promise.all([
        base44.entities.Order.list('-created_date', 500),
        base44.entities.Review.list('-created_date', 500),
        base44.entities.Message.list('-created_date', 500),
        base44.entities.Notification.list('-created_date', 500),
        base44.entities.ContactRequest.list('-created_date', 500),
      ]);
      await Promise.all([
        ...orders.map(o => base44.entities.Order.delete(o.id)),
        ...reviews.map(r => base44.entities.Review.delete(r.id)),
        ...messages.map(m => base44.entities.Message.delete(m.id)),
        ...notifications.map(n => base44.entities.Notification.delete(n.id)),
        ...requests.map(r => base44.entities.ContactRequest.delete(r.id)),
      ]);
      queryClient.invalidateQueries();
      toast.success('All test data cleared. Fresh start!');
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
    setResetting(false);
  };

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['all-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 20),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['contact-requests'],
    queryFn: () => base44.entities.ContactRequest.list('-created_date', 50),
  });

  // Every headline number is real-data only — test orders and test products are
  // reported separately below so they can never quietly inflate the store's
  // stats (see src/lib/testMode.js).
  const liveOrders = realOrders(orders);
  const testOnlyOrders = testOrders(orders);
  const liveProducts = products.filter(p => !isTestProduct(p));
  const testProducts = products.filter(isTestProduct);

  const totalRevenue = liveOrders.reduce((sum, o) => sum + (o.profit_recorded ?? 0), 0);
  const testRevenue = testOnlyOrders.reduce((sum, o) => sum + (o.profit_recorded ?? 0), 0);
  const pendingOrders = liveOrders.filter(o => o.status === 'pending').length;
  const newRequests = requests.filter(r => r.status === 'new').length;
  const hasTestData = testOnlyOrders.length > 0 || testProducts.length > 0;

  const recentOrders = orders.slice(0, 5);

  const statusColors = {
    pending: 'text-yellow-400',
    confirmed: 'text-blue-400',
    shipped: 'text-purple-400',
    delivered: 'text-accent',
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of your store</p>
        </div>
        <button
          onClick={handleResetTestData}
          disabled={resetting}
          className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/30 text-destructive font-mono text-xs uppercase hover:bg-destructive/20 transition-colors disabled:opacity-50"
        >
          {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Reset Test Data
        </button>
      </div>

      {/* Stats — real data only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Products" value={liveProducts.length} />
        <StatCard icon={ShoppingCart} label="Total Orders" value={liveOrders.length} />
        <StatCard icon={DollarSign} label="Revenue" value={`$${totalRevenue.toFixed(2)}`} color="text-primary" />
        <StatCard icon={Clock} label="Pending" value={pendingOrders} color={pendingOrders > 0 ? 'text-yellow-400' : 'text-foreground'} />
      </div>

      {/* Test data — excluded from every number above */}
      {hasTestData && (
        <div className="border border-orange-400/30 bg-orange-400/5 p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5" /> Test Data (excluded)
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Test orders: <span className="text-orange-400 font-bold">{testOnlyOrders.length}</span>
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Test revenue: <span className="text-orange-400 font-bold">${testRevenue.toFixed(2)}</span>
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Test products: <span className="text-orange-400 font-bold">{testProducts.length}</span>
            </p>
            <Link to="/admin/products" className="font-mono text-xs text-primary hover:underline ml-auto">MANAGE</Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-card border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Recent Orders</h2>
            <Link to="/admin/orders" className="font-mono text-xs text-primary hover:underline">VIEW ALL</Link>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.length === 0 ? (
              <p className="p-4 font-mono text-xs text-muted-foreground text-center">No orders yet</p>
            ) : (
              recentOrders.map(order => (
                <div key={order.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {order.customer_name || 'Unknown'}
                      {isTestOrder(order) && (
                        <span className={TEST_BADGE_CLASS}><FlaskConical className="w-2.5 h-2.5" /> Test</span>
                      )}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {order.created_date ? format(new Date(order.created_date), 'MMM d, HH:mm') : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs uppercase ${statusColors[order.status] || 'text-muted-foreground'}`}>
                      {order.status}
                    </span>
                    <span className="font-mono font-bold">${order.total?.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Requests */}
        <div className="bg-card border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Requests {newRequests > 0 && <span className="text-primary ml-1">({newRequests} new)</span>}
            </h2>
            <Link to="/admin/requests" className="font-mono text-xs text-primary hover:underline">VIEW ALL</Link>
          </div>
          <div className="divide-y divide-border">
            {requests.length === 0 ? (
              <p className="p-4 font-mono text-xs text-muted-foreground text-center">No requests</p>
            ) : (
              requests.slice(0, 5).map(req => (
                <div key={req.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{req.name}</p>
                    <span className={`font-mono text-[10px] uppercase px-2 py-0.5 ${
                      req.status === 'new' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{req.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Customer Analytics ── */}
      <CustomerAnalytics />
    </div>
  );
}