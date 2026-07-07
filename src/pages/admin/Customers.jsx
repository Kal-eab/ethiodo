import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminCustomers() {
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['all-referrals'],
    queryFn: () => base44.entities.CustomerReferral.list('-date_created', 1000),
  });

  const { data: links = [] } = useQuery({
    queryKey: ['creator-product-links'],
    queryFn: () => base44.entities.CreatorProductLink.list('-date_created', 500),
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['creators'],
    queryFn: () => base44.entities.Creator.list('-date_added', 200),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'admin'],
    queryFn: () => base44.entities.Product.filter({}, '-created_date', 500),
  });

  const creatorMap = Object.fromEntries(creators.map(c => [c.id, c]));
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));
  const linkMap = Object.fromEntries(links.map(l => [l.id, l]));

  // Group referrals by customer_email
  const referralsByEmail = {};
  referrals.forEach(r => {
    if (!referralsByEmail[r.customer_email]) referralsByEmail[r.customer_email] = [];
    referralsByEmail[r.customer_email].push(r);
  });

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">{users.length} total registered users</p>
        </div>
      </div>

      {/* Search */}
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

      {/* Table */}
      <div className="bg-card border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider">User</th>
              <th className="text-left p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Email</th>
              <th className="text-left p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Phone</th>
              <th className="text-left p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Role</th>
              <th className="text-left p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Referred Product</th>
              <th className="text-left p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Referred By</th>
              <th className="text-left p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  <td className="p-4"><div className="h-4 bg-secondary animate-pulse w-40" /></td>
                  <td className="p-4 hidden sm:table-cell"><div className="h-4 bg-secondary animate-pulse w-52" /></td>
                  <td className="p-4 hidden md:table-cell"><div className="h-4 bg-secondary animate-pulse w-16" /></td>
                  <td className="p-4 hidden lg:table-cell"><div className="h-4 bg-secondary animate-pulse w-24" /></td>
                  <td className="p-4 hidden xl:table-cell"><div className="h-4 bg-secondary animate-pulse w-24" /></td>
                  <td className="p-4 hidden xl:table-cell"><div className="h-4 bg-secondary animate-pulse w-24" /></td>
                  <td className="p-4 hidden lg:table-cell"><div className="h-4 bg-secondary animate-pulse w-24" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="font-mono text-xs text-muted-foreground uppercase">No users found</p>
                </td>
              </tr>
            ) : (
              filtered.map(user => {
                const userRefs = referralsByEmail[user.email] || [];
                return (
                <tr key={user.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(180,255,0,0.1)', color: '#B4FF00', border: '1px solid rgba(180,255,0,0.25)' }}
                      >
                        {(user.full_name || user.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{user.full_name || '—'}</p>
                        <p className="font-mono text-[10px] text-muted-foreground sm:hidden">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <p className="font-mono text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <p className="font-mono text-xs text-muted-foreground">{user.phone || '—'}</p>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <span className={`font-mono text-[10px] uppercase px-2 py-0.5 border ${
                      user.role === 'admin'
                        ? 'text-primary border-primary/30 bg-primary/5'
                        : 'text-muted-foreground border-border bg-secondary'
                    }`}>
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="p-4 hidden xl:table-cell">
                    {userRefs.length === 0 ? (
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="space-y-0.5">
                        {userRefs.map((r, i) => {
                          const product = productMap[r.product_id];
                          return (
                            <p key={i} className="text-xs truncate max-w-[140px]">{product?.name || r.product_id?.slice(-8) || '—'}</p>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="p-4 hidden xl:table-cell">
                    {userRefs.length === 0 ? (
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="space-y-0.5">
                        {userRefs.map((r, i) => {
                          const link = linkMap[r.creator_product_link_id];
                          const creator = link ? creatorMap[link.creator_id] : null;
                          return (
                            <p key={i} className="text-xs truncate max-w-[140px]">{creator?.name || '—'}</p>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <p className="font-mono text-xs text-muted-foreground">
                      {user.created_date ? format(new Date(user.created_date), 'MMM d, yyyy') : '—'}
                    </p>
                  </td>
                </tr>
              );})
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}