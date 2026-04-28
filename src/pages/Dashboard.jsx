import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, Clock, CheckCircle, Truck, ShoppingBag, Heart, ArrowRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';

const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', icon: AlertCircle,   step: 0 },
  confirmed: { label: 'Confirmed', color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30',     icon: CheckCircle,   step: 1 },
  shipped:   { label: 'Shipped',   color: 'text-primary',    bg: 'bg-primary/10 border-primary/30',       icon: Truck,         step: 2 },
  delivered: { label: 'Delivered', color: 'text-accent',     bg: 'bg-accent/10 border-accent/30',         icon: CheckCircle,   step: 3 },
};

const STEPS = [
  { key: 'pending',   label: 'Order Placed',  desc: 'Awaiting payment verification' },
  { key: 'confirmed', label: 'Confirmed',      desc: 'Payment verified, preparing' },
  { key: 'shipped',   label: 'On the Way',     desc: 'Your order is being delivered' },
  { key: 'delivered', label: 'Delivered',      desc: 'Order completed!' },
];

function DeliveryProgress({ status }) {
  const currentStep = STATUS_CONFIG[status]?.step ?? 0;
  return (
    <div className="mt-3 space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <React.Fragment key={s.key}>
              <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-all ${
                done  ? 'bg-primary border-primary' :
                active ? 'bg-primary/30 border-primary scale-125' :
                'bg-transparent border-border'
              }`} />
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Step labels */}
      <div className="flex items-start justify-between">
        {STEPS.map((s, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={s.key} className={`flex-1 text-center ${i === 0 ? 'text-left' : i === STEPS.length - 1 ? 'text-right' : ''}`}>
              <p className={`font-mono text-[9px] uppercase font-bold leading-tight ${
                active ? 'text-primary' : done ? 'text-muted-foreground' : 'text-border'
              }`}>{s.label}</p>
            </div>
          );
        })}
      </div>
      {/* Current step description */}
      <p className="font-mono text-[10px] text-muted-foreground italic">
        {STEPS[currentStep]?.desc}
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card border border-border p-4 flex items-center gap-4">
      <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${color}`}
        style={{ background: 'rgba(255,255,255,0.04)' }}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xl font-black">{value}</p>
      </div>
    </div>
  );
}

function RecentOrderCard({ order }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const visibleItems = (order.items || []).filter(i => !i.removed);
  const firstImg = visibleItems[0]?.product_image;

  return (
    <div className="bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-3">
          {firstImg && (
            <img src={firstImg} alt="" className="w-9 h-9 object-cover border border-border flex-shrink-0" />
          )}
          <div>
            <p className="font-mono text-[10px] text-muted-foreground">
              ORDER #{order.id?.slice(-8).toUpperCase()}
            </p>
            <p className="text-sm font-semibold truncate max-w-[180px]">
              {visibleItems.map(i => i.product_name).join(', ')}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono font-black text-primary text-base">{fmt(order.total)} <span className="text-xs font-normal">Birr</span></p>
          <p className="font-mono text-[10px] text-muted-foreground">
            {order.created_date ? format(new Date(order.created_date), 'MMM d') : ''}
          </p>
        </div>
      </div>

      {/* Status badge + progress */}
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] px-2 py-0.5 border ${cfg.bg} ${cfg.color}`}>
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </span>
        </div>
        <DeliveryProgress status={order.status} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ created_by: user.email }, '-created_date', 20),
    enabled: !!user?.email,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => base44.entities.Favorite.list(),
  });

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Dashboard" />
      <Navbar />
      <main className="pt-16 pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

          {/* Greeting */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">
              {user ? `Hey, ${user.full_name?.split(' ')[0] || 'there'} 👋` : 'My Dashboard'}
            </h1>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-1">
              Here's what's happening with your orders
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <StatCard icon={Package}     label="Total Orders"   value={orders.length}        color="text-primary" />
            <StatCard icon={Truck}       label="Active"         value={activeOrders.length}  color="text-blue-400" />
            <StatCard icon={Heart}       label="Saved Items"    value={favorites.length}     color="text-rose-400" />
          </div>

          {/* Recent Orders */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Recent Orders</h2>
            <Link to="/orders" className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card border border-border p-4 animate-pulse h-28" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border">
              <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="font-mono text-xs text-muted-foreground uppercase">No orders yet</p>
              <Link to="/" className="text-primary font-mono text-sm mt-3 inline-block hover:underline">
                Start shopping →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <RecentOrderCard key={order.id} order={order} />
              ))}
            </div>
          )}

          {/* Quick links */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Link to="/" className="bg-card border border-border p-4 flex items-center gap-3 hover:border-primary/50 transition-colors group">
              <ShoppingBag className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Browse Store</span>
            </Link>
            <Link to="/favorites" className="bg-card border border-border p-4 flex items-center gap-3 hover:border-primary/50 transition-colors group">
              <Heart className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">My Favorites</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}