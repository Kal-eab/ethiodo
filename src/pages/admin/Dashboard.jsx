import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, ShoppingCart, DollarSign, MessageSquare, Clock, Check, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

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
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['all-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 200),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['contact-requests'],
    queryFn: () => base44.entities.ContactRequest.list('-created_date', 50),
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const newRequests = requests.filter(r => r.status === 'new').length;

  const recentOrders = orders.slice(0, 5);

  const statusColors = {
    pending: 'text-yellow-400',
    confirmed: 'text-blue-400',
    shipped: 'text-purple-400',
    delivered: 'text-accent',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your store</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Products" value={products.length} />
        <StatCard icon={ShoppingCart} label="Total Orders" value={orders.length} />
        <StatCard icon={DollarSign} label="Revenue" value={`$${totalRevenue.toFixed(2)}`} color="text-primary" />
        <StatCard icon={Clock} label="Pending" value={pendingOrders} color={pendingOrders > 0 ? 'text-yellow-400' : 'text-foreground'} />
      </div>

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
                    <p className="text-sm font-medium">{order.customer_name || 'Unknown'}</p>
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
    </div>
  );
}