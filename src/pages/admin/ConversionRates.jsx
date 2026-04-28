import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, Legend,
} from 'recharts';
import { TrendingUp, ShoppingCart, Eye, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';

const PRIMARY = '#B4FF00';
const ACCENT = '#60a5fa';
const MUTED = '#4a7a00';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-card border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="font-mono text-2xl font-bold mt-1.5" style={{ color: color || undefined }}>{value}</p>
          {sub && <p className="font-mono text-[10px] text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="w-9 h-9 bg-secondary flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs font-mono shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}{p.name.includes('Rate') || p.name.includes('%') ? '%' : ''}</p>
      ))}
    </div>
  );
};

export default function ConversionRates() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMetric, setActiveMetric] = useState('viewToPurchase');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getConversionRates', {});
      setData(res.data);
    } catch (e) {
      setError(e.message || 'Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const metricOptions = [
    { key: 'viewToPurchase', label: 'View → Purchase %', color: PRIMARY },
    { key: 'viewToCart', label: 'View → Cart %', color: ACCENT },
    { key: 'cartToCheckout', label: 'Cart → Checkout %', color: '#a78bfa' },
    { key: 'checkoutToPurchase', label: 'Checkout → Purchase %', color: '#f97316' },
  ];

  const selectedMetric = metricOptions.find(m => m.key === activeMetric);

  // Summary stats
  const totalRevenue = data?.items?.reduce((s, i) => s + i.revenue, 0) || 0;
  const totalPurchases = data?.items?.reduce((s, i) => s + i.purchased, 0) || 0;
  const totalViews = data?.items?.reduce((s, i) => s + i.viewed, 0) || 0;
  const avgConv = totalViews > 0 ? ((totalPurchases / totalViews) * 100).toFixed(2) : '0.00';
  const topItem = data?.items?.[0];

  // Top performers: items with highest view→purchase rate (min 10 views)
  const topPerformers = [...(data?.items || [])]
    .filter(i => i.viewed >= 10)
    .sort((a, b) => b[activeMetric] - a[activeMetric])
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conversion Rate Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            {data?.propertyName ? `GA4: ${data.propertyName}` : 'Last 30 days · Powered by Google Analytics'}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-mono text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Failed to load analytics</p>
            <p className="font-mono text-xs text-muted-foreground mt-1">{error}</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-2 opacity-70">
            Tip: Make sure your Google account has a GA4 property with ecommerce tracking enabled, and that it contains transaction data.
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="bg-card border border-border p-5 h-24 animate-pulse" />)}
          </div>
          <div className="bg-card border border-border h-64 animate-pulse" />
        </div>
      )}

      {/* Content */}
      {!loading && data && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp} label="Avg Conversion Rate" value={`${avgConv}%`} sub="Views → Purchases" color={PRIMARY} />
            <StatCard icon={ShoppingCart} label="Total Purchases" value={totalPurchases.toLocaleString()} sub="Last 30 days" />
            <StatCard icon={Eye} label="Total Item Views" value={totalViews.toLocaleString()} sub="Last 30 days" />
            <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} sub="Last 30 days" color={ACCENT} />
          </div>

          {/* Daily conv rate line chart */}
          {data.daily?.length > 0 && (
            <div className="bg-card border border-border p-5" style={{ background: '#0d0d0d' }}>
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4">
                Daily Session Conversion Rate (%)
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} width={32} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="convRate" name="Conv Rate" stroke={PRIMARY} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Metric selector + bar chart */}
          {topPerformers.length > 0 && (
            <div className="bg-card border border-border p-5" style={{ background: '#0d0d0d' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                  Top Products by Conversion Funnel
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {metricOptions.map(m => (
                    <button
                      key={m.key}
                      onClick={() => setActiveMetric(m.key)}
                      className="font-mono text-[10px] px-2.5 py-1 border transition-colors"
                      style={{
                        borderColor: activeMetric === m.key ? m.color : 'rgba(255,255,255,0.1)',
                        color: activeMetric === m.key ? m.color : '#666',
                        background: activeMetric === m.key ? `${m.color}15` : 'transparent',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topPerformers} layout="vertical" barCategoryGap="25%">
                  <XAxis type="number" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey={activeMetric} name={selectedMetric?.label} radius={0} isAnimationActive={false}>
                    {topPerformers.map((entry, i) => (
                      <Cell key={i} fill={i === 0 ? selectedMetric?.color : MUTED} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Full product table */}
          {data.items?.length > 0 && (
            <div className="bg-card border border-border" style={{ background: '#0d0d0d' }}>
              <div className="p-4 border-b border-border">
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                  All Products — Conversion Breakdown
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['Product', 'Views', 'Cart Adds', 'Checkouts', 'Purchases', 'Revenue', 'View→Purchase'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] text-muted-foreground uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.items.map((item, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5 text-xs font-medium max-w-[180px] truncate">{item.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{item.viewed.toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{item.cartAdds.toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{item.checkouts.toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-mono text-xs font-bold" style={{ color: PRIMARY }}>{item.purchased.toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-mono text-xs" style={{ color: ACCENT }}>${item.revenue.toLocaleString()}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden min-w-[60px]">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.min(100, item.viewToPurchase * 5)}%`, background: PRIMARY }}
                              />
                            </div>
                            <span className="font-mono text-[11px]" style={{ color: PRIMARY }}>{item.viewToPurchase}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {data.items?.length === 0 && (
            <div className="text-center py-16 border border-border bg-card">
              <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-mono text-sm text-muted-foreground">No ecommerce transaction data found in this GA4 property.</p>
              <p className="font-mono text-xs text-muted-foreground mt-1">Make sure GA4 ecommerce tracking is set up on your store.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}