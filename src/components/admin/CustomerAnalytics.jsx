import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, ShoppingBag, UserPlus, Calendar, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const timeAgo = (dateStr) => {
  if (!dateStr) return 'Never';
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return diff + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
};

function CustomerStatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-card border border-border p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="font-mono text-3xl font-bold mt-2" style={{ color: color || undefined }}>
            {value}
          </p>
          {sub && <p className="font-mono text-[10px] text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 bg-secondary flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#111', border: '1px solid #1a1a1a', padding: '8px 12px' }}>
        <p className="font-mono text-[10px] text-muted-foreground">{label}</p>
        <p className="font-mono text-sm font-bold" style={{ color: '#B4FF00' }}>
          {payload[0].value} new users
        </p>
      </div>
    );
  }
  return null;
};

export default function CustomerAnalytics() {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0); // for timeAgo re-render

  const fetchData = useCallback(async () => {
    const users = await base44.entities.User.list('-created_date', 500);
    setAllUsers(users);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    // Tick for timeAgo updates
    const tickInterval = setInterval(() => setTick(t => t + 1), 10000);
    return () => { clearInterval(interval); clearInterval(tickInterval); };
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  // ── Derived stats ──
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const totalCustomers = allUsers.length;
  const activeCustomers = allUsers.filter(u => (u.total_orders || 0) > 0).length;
  const newToday = allUsers.filter(u => u.created_date && new Date(u.created_date) >= todayStart).length;
  const newThisWeek = allUsers.filter(u => u.created_date && new Date(u.created_date) >= weekStart).length;

  // ── Chart data (last 14 days) ──
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const chartData = last14Days.map(dayStart => {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = allUsers.filter(u => {
      if (!u.created_date) return false;
      const d = new Date(u.created_date);
      return d >= dayStart && d < dayEnd;
    }).length;
    return {
      day: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
      isToday: dayStart.toDateString() === new Date().toDateString(),
      isWeekend: [0, 6].includes(dayStart.getDay()),
      dayStart,
    };
  });

  // ── Weekly performance ──
  const thisWeekUsers = newThisWeek;
  const lastWeekUsers = allUsers.filter(u => {
    if (!u.created_date) return false;
    const d = new Date(u.created_date);
    return d >= lastWeekStart && d < weekStart;
  }).length;
  const growthPercent = lastWeekUsers === 0 ? 100 : Math.round(((thisWeekUsers - lastWeekUsers) / lastWeekUsers) * 100);
  const bestDay = chartData.reduce((best, day) => day.count > best.count ? day : best, chartData[0] || { day: '—', count: 0 });

  // ── Recent logins ──
  const recentLogins = [...allUsers]
    .filter(u => u.last_login_at)
    .sort((a, b) => new Date(b.last_login_at) - new Date(a.last_login_at))
    .slice(0, 8);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card border border-border p-6 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Section label ── */}
      <div className="flex items-center gap-3">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Customer Analytics</p>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── 4 Customer stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard icon={Users} label="Total Customers" value={totalCustomers} />
        <CustomerStatCard icon={ShoppingBag} label="Active Customers" value={activeCustomers} color="#B4FF00" sub="Placed at least 1 order" />
        <CustomerStatCard icon={UserPlus} label="New Today" value={newToday} color="#60a5fa" />
        <CustomerStatCard icon={Calendar} label="New This Week" value={newThisWeek} color="#a78bfa" />
      </div>

      {/* ── Chart + Recent Logins ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar chart — 60% */}
        <div className="lg:col-span-3 bg-card border border-border p-5" style={{ background: '#0d0d0d' }}>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4">
            New Customer Joins — Last 14 Days
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="30%">
              <XAxis
                dataKey="day"
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#555' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#555' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={24}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={0} isAnimationActive={false}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.isToday ? '#B4FF00' : entry.isWeekend ? '#7ab800' : '#4a7a00'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Summary lines */}
          <div className="mt-4 pt-4 border-t border-border space-y-1.5">
            <p className="font-mono text-[10px] text-muted-foreground">
              Best day this week:{' '}
              <span style={{ color: '#B4FF00' }}>{bestDay.day}</span>
              {' '}with <span style={{ color: '#B4FF00' }}>{bestDay.count}</span> new users
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              This week vs last week:{' '}
              <span style={{ color: growthPercent >= 0 ? '#B4FF00' : '#f87171', fontWeight: 'bold' }}>
                {growthPercent >= 0 ? '+' : ''}{growthPercent}%
              </span>
              {' '}({thisWeekUsers} vs {lastWeekUsers})
            </p>
          </div>
        </div>

        {/* Recent logins — 40% */}
        <div className="lg:col-span-2 bg-card border border-border" style={{ background: '#0d0d0d' }}>
          <div className="p-4 border-b border-border flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#B4FF00' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#B4FF00' }} />
            </span>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Live — Recent Logins</p>
          </div>
          <div className="divide-y divide-border">
            {recentLogins.length === 0 ? (
              <p className="p-4 font-mono text-xs text-muted-foreground text-center">No logins tracked yet</p>
            ) : (
              recentLogins.map((u, i) => {
                const isVeryRecent = u.last_login_at && (new Date() - new Date(u.last_login_at)) < 5 * 60 * 1000;
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={i === 0 ? { background: 'rgba(180,255,0,0.04)' } : {}}
                  >
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold flex-shrink-0"
                      style={{
                        background: isVeryRecent ? 'rgba(180,255,0,0.15)' : 'rgba(255,255,255,0.06)',
                        color: isVeryRecent ? '#B4FF00' : '#888',
                        border: `1px solid ${isVeryRecent ? 'rgba(180,255,0,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {(u.full_name || u.email || '?')[0].toUpperCase()}
                    </div>
                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{u.full_name || 'Unknown'}</p>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {/* Time + orders */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-[10px]" style={{ color: isVeryRecent ? '#B4FF00' : '#666' }}>
                        {timeAgo(u.last_login_at)}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground">{u.login_count || 1} login{(u.login_count || 1) !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Weekly Performance Summary bar ── */}
      <div
        className="flex flex-wrap items-center gap-4 sm:gap-8 px-5 py-3 border-y border-border font-mono text-[10px]"
        style={{ background: '#0a0a0a', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <span className="text-muted-foreground">
          📈 Best performing day:{' '}
          <span style={{ color: '#B4FF00' }}>{bestDay.day}</span>
          {' '}(<span style={{ color: '#B4FF00' }}>{bestDay.count}</span> joins)
        </span>
        <span className="text-muted-foreground">
          🔥 This week:{' '}
          <span style={{ color: '#B4FF00' }}>{thisWeekUsers}</span> new users
        </span>
        <span className="text-muted-foreground">
          📊 Growth vs last week:{' '}
          <span style={{ color: growthPercent >= 0 ? '#B4FF00' : '#f87171', fontWeight: 'bold' }}>
            {growthPercent >= 0 ? '+' : ''}{growthPercent}%
          </span>
        </span>
        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-40"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          REFRESH
        </button>
      </div>
    </div>
  );
}