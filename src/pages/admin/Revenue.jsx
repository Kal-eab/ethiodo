import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, getDate } from 'date-fns';
import { DollarSign, Package, ChevronRight, ChevronDown, ArrowLeft } from 'lucide-react';

const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

// Given a day-of-month (1-31), return "Week 1", "Week 2", "Week 3", or "Week 4"
function getWeekLabel(dayOfMonth) {
  if (dayOfMonth <= 7) return 'Week 1';
  if (dayOfMonth <= 14) return 'Week 2';
  if (dayOfMonth <= 21) return 'Week 3';
  return 'Week 4';
}

function getWeekOrder(label) {
  return parseInt(label.split(' ')[1]);
}

// Group orders: { [monthKey]: { label, total, weeks: { [weekLabel]: { total, orders[] } } } }
function groupOrders(orders) {
  const months = {};
  for (const order of orders) {
    const date = new Date(order.money_received_date || order.created_date);
    const monthKey = format(date, 'yyyy-MM');
    const monthLabel = format(date, 'MMMM yyyy');
    const weekLabel = getWeekLabel(getDate(date));
    const profit = order.profit_recorded ?? order.total ?? 0;

    if (!months[monthKey]) {
      months[monthKey] = { label: monthLabel, total: 0, weeks: {} };
    }
    months[monthKey].total += profit;

    if (!months[monthKey].weeks[weekLabel]) {
      months[monthKey].weeks[weekLabel] = { total: 0, orders: [] };
    }
    months[monthKey].weeks[weekLabel].total += profit;
    months[monthKey].weeks[weekLabel].orders.push(order);
  }
  return months;
}

function OrderRow({ order }) {
  const profit = order.profit_recorded ?? order.total ?? 0;
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">#{order.id?.slice(-8).toUpperCase()}</span>
          <span className="text-sm font-medium truncate">{order.customer_name || order.customer_email}</span>
        </div>
        <p className="font-mono text-xs text-muted-foreground truncate">
          {(order.items || []).map(i => i.product_name).join(', ')}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-mono font-black text-primary text-sm">{fmt(profit)} <span className="text-xs font-normal">Birr</span></p>
        {order.profit_recorded != null && order.profit_recorded !== order.total && (
          <p className="font-mono text-[10px] text-muted-foreground">sale: {fmt(order.total)}</p>
        )}
        <p className="font-mono text-[10px] text-muted-foreground">
          {order.money_received_date ? format(new Date(order.money_received_date), 'MMM d') : '—'}
        </p>
      </div>
    </div>
  );
}

export default function Revenue() {
  const [selectedMonth, setSelectedMonth] = useState(null); // monthKey
  const [selectedWeek, setSelectedWeek] = useState(null);   // weekLabel

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 500),
  });

  const revenueOrders = orders.filter(o => o.money_received);
  const totalRevenue = revenueOrders.reduce((sum, o) => sum + (o.profit_recorded ?? o.total ?? 0), 0);
  const grouped = useMemo(() => groupOrders(revenueOrders), [revenueOrders]);

  // Sort months descending
  const sortedMonths = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));

  const handleSelectMonth = (monthKey) => {
    setSelectedMonth(monthKey);
    setSelectedWeek(null);
  };

  const handleBack = () => {
    if (selectedWeek) {
      setSelectedWeek(null);
    } else {
      setSelectedMonth(null);
    }
  };

  const currentMonth = selectedMonth ? grouped[selectedMonth] : null;
  const currentWeek = selectedWeek && currentMonth ? currentMonth.weeks[selectedWeek] : null;

  // Breadcrumb label
  const breadcrumb = selectedWeek
    ? `${currentMonth?.label} / ${selectedWeek}`
    : selectedMonth
    ? currentMonth?.label
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {selectedMonth && (
          <button onClick={handleBack} className="flex items-center justify-center w-8 h-8 border border-border hover:border-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div>
          <h1 className="font-mono text-lg font-bold uppercase tracking-wider">
            {breadcrumb || 'Revenue'}
          </h1>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            {selectedWeek ? 'Order details' : selectedMonth ? 'Weekly breakdown' : 'Monthly overview'}
          </p>
        </div>
      </div>

      {/* Total card */}
      <div className="bg-card border border-primary/30 p-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, rgba(180,255,0,0.05) 0%, transparent 100%)' }}>
        <div className="w-10 h-10 bg-primary/10 flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            {selectedWeek ? `${selectedWeek} Profit` : selectedMonth ? `${currentMonth?.label} Profit` : 'Total Profit'}
          </p>
          <p className="font-mono text-2xl font-black text-primary">
            {fmt(currentWeek?.total ?? currentMonth?.total ?? totalRevenue)}
            <span className="text-sm font-normal ml-1">Birr</span>
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {currentWeek
              ? `${currentWeek.orders.length} orders`
              : currentMonth
              ? `${Object.keys(currentMonth.weeks).length} weeks`
              : `${sortedMonths.length} months`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-secondary animate-pulse" />)}
        </div>
      ) : revenueOrders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="font-mono text-xs text-muted-foreground uppercase">No revenue recorded yet</p>
          <p className="font-mono text-xs text-muted-foreground mt-1">Mark delivered orders as "Money Received"</p>
        </div>

      ) : selectedWeek && currentWeek ? (
        // ── Level 3: Orders list ──
        <div className="bg-card border border-border overflow-hidden">
          {currentWeek.orders.map(order => (
            <OrderRow key={order.id} order={order} />
          ))}
          <div className="p-3 border-t border-primary/20 bg-primary/5 flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase text-muted-foreground">Week Total</span>
            <span className="font-mono font-black text-primary">{fmt(currentWeek.total)} Birr</span>
          </div>
        </div>

      ) : selectedMonth && currentMonth ? (
        // ── Level 2: Weeks in month ──
        <div className="space-y-2">
          {Object.entries(currentMonth.weeks)
            .sort((a, b) => getWeekOrder(a[0]) - getWeekOrder(b[0]))
            .map(([weekLabel, weekData]) => (
              <button
                key={weekLabel}
                onClick={() => setSelectedWeek(weekLabel)}
                className="w-full bg-card border border-border p-4 flex items-center gap-4 hover:border-primary/50 transition-colors text-left group"
              >
                <div className="w-8 h-8 bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-xs font-bold text-primary">{getWeekOrder(weekLabel)}</span>
                </div>
                <div className="flex-1">
                  <p className="font-mono text-sm font-bold">{weekLabel}</p>
                  <p className="font-mono text-xs text-muted-foreground">{weekData.orders.length} orders</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-black text-primary">{fmt(weekData.total)} <span className="text-xs font-normal">Birr</span></p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
              </button>
            ))}
          <div className="bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase">Month Total</span>
            <span className="font-mono font-black text-primary text-base">{fmt(currentMonth.total)} Birr</span>
          </div>
        </div>

      ) : (
        // ── Level 1: Months list ──
        <div className="space-y-2">
          {sortedMonths.map(([monthKey, monthData]) => (
            <button
              key={monthKey}
              onClick={() => handleSelectMonth(monthKey)}
              className="w-full bg-card border border-border p-4 flex items-center gap-4 hover:border-primary/50 transition-colors text-left group"
            >
              <div className="w-10 h-10 bg-secondary flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">
                  {format(new Date(monthKey + '-01'), 'MMM')}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-mono text-sm font-bold">{monthData.label}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {Object.keys(monthData.weeks).length} weeks · {Object.values(monthData.weeks).reduce((s, w) => s + w.orders.length, 0)} orders
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono font-black text-primary text-base">{fmt(monthData.total)} <span className="text-xs font-normal">Birr</span></p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </button>
          ))}
          <div className="bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase">All Time Total</span>
            <span className="font-mono font-black text-primary text-lg">{fmt(totalRevenue)} Birr</span>
          </div>
        </div>
      )}
    </div>
  );
}