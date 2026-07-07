import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Bike, UserPlus, UserMinus, CheckCircle2, Clock, MapPin, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ─── Partners tab: promote/demote users to the 'delivery' role ───────────────
function PartnersTab() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users-for-delivery'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
  });

  const setRole = async (userId, role) => {
    await base44.entities.User.update(userId, { role });
    queryClient.invalidateQueries({ queryKey: ['all-users-for-delivery'] });
    toast.success(role === 'delivery' ? 'Promoted to Delivery Partner' : 'Removed as Delivery Partner');
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const partners = filtered.filter(u => u.role === 'delivery');
  const others = filtered.filter(u => u.role !== 'delivery' && u.role !== 'admin');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-secondary border border-border px-3 py-2 max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
        />
      </div>

      <div>
        <p className="font-mono text-xs text-muted-foreground uppercase mb-3">Delivery Partners ({partners.length})</p>
        {isLoading ? (
          <div className="h-20 bg-secondary animate-pulse" />
        ) : partners.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border">
            <p className="font-mono text-xs text-muted-foreground uppercase">No delivery partners yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {partners.map(u => (
              <div key={u.id} className="bg-card border border-border p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{u.full_name || '—'}</p>
                  <p className="font-mono text-xs text-muted-foreground">{u.email} {u.phone && `· ${u.phone}`}</p>
                </div>
                <button
                  onClick={() => setRole(u.id, 'user')}
                  className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <UserMinus className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="font-mono text-xs text-muted-foreground uppercase mb-3">Other Registered Users</p>
        <div className="bg-card border border-border divide-y divide-border max-h-96 overflow-y-auto">
          {others.map(u => (
            <div key={u.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{u.full_name || '—'}</p>
                <p className="font-mono text-xs text-muted-foreground">{u.email}</p>
              </div>
              <button
                onClick={() => setRole(u.id, 'delivery')}
                className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Make Delivery Partner
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Assignments tab: audit every pickup/handoff across all couriers ─────────
function AssignmentsTab() {
  const [filter, setFilter] = useState('assigned');

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['all-delivery-assignments', filter],
    queryFn: () => base44.entities.DeliveryAssignment.filter({ status: filter }, '-created_date', 200),
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-border">
        {['assigned', 'received'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs uppercase transition-colors border-b-2 -mb-px ${
              filter === s ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {s === 'assigned' ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {s === 'assigned' ? 'Pending Pickup' : 'Received'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-secondary animate-pulse" />)}</div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border">
          <Bike className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-mono text-xs text-muted-foreground uppercase">No {filter} deliveries</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => (
            <div key={a.id} className="bg-card border border-border p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-mono text-xs text-muted-foreground">ORDER #{a.order_id?.slice(-8).toUpperCase()}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {a.created_date ? format(new Date(a.created_date), 'MMM d, yyyy HH:mm') : ''}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase">Courier</p>
                  <p className="font-semibold">{a.delivery_user_name || a.delivery_user_email || '—'}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase">Carrier</p>
                  <p>{a.carrier_name || '—'} {a.carrier_phone && <span className="font-mono text-xs text-muted-foreground">· {a.carrier_phone}</span>}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase">Customer</p>
                  <p className="flex items-center gap-1.5">{a.customer_name || '—'}</p>
                  {a.delivery_address && (
                    <p className="flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> {a.delivery_address}</p>
                  )}
                </div>
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase">Money</p>
                  <p className="flex items-center gap-1.5 font-mono text-xs">
                    <Banknote className="w-3.5 h-3.5 text-yellow-400" />
                    Carrier: {a.cash_to_carrier || 0} Birr · Tax: {a.customs_tax || 0} Birr
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {a.reference_photo_url && (
                  <a href={a.reference_photo_url} target="_blank" rel="noopener noreferrer">
                    <img src={a.reference_photo_url} alt="Reference" className="w-16 h-16 object-cover border border-border" />
                  </a>
                )}
                {a.received_photo_url && (
                  <a href={a.received_photo_url} target="_blank" rel="noopener noreferrer">
                    <img src={a.received_photo_url} alt="Received proof" className="w-16 h-16 object-cover border border-primary/40" />
                  </a>
                )}
              </div>
              {a.notes && <p className="text-xs text-muted-foreground italic">"{a.notes}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDeliveries() {
  const [tab, setTab] = useState('assignments');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <p className="font-mono text-xs text-muted-foreground mt-1">Manage delivery partners and courier pickups</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[{ key: 'assignments', label: 'Assignments' }, { key: 'partners', label: 'Partners' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 font-mono text-xs uppercase transition-colors border-b-2 -mb-px ${
              tab === t.key ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'assignments' ? <AssignmentsTab /> : <PartnersTab />}
    </div>
  );
}
