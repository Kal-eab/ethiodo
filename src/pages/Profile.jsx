import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { User, LogOut, Trash2, ChevronRight, Shield, FileText, RotateCcw, AlertTriangle, MapPin, ChevronDown, Loader2, Save, Heart, Package, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import { toast } from 'sonner';
import { REGIONS, REGIONS_CITIES } from '@/lib/ethiopiaRegions';
import ProductCard from '@/components/store/ProductCard';
import { formatSelection } from '@/lib/productOptions';

const PHONE_REGEX = /^\+251\s?[79]\d{8}$|^0[79]\d{8}$/;
const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const STATUS_STYLES = {
  pending:   { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', label: 'Pending' },
  confirmed: { color: 'text-primary',    bg: 'bg-primary/10 border-primary/30',       label: 'Confirmed' },
  delivered: { color: 'text-accent',     bg: 'bg-accent/10 border-accent/30',          label: 'Delivered' },
};

// ── Favorites Tab ─────────────────────────────────────────────────────────────
function FavoritesTab({ user }) {
  const { data: favorites = [], isLoading: loadingFavs } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => base44.entities.Favorite.list(),
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', 'published'],
    queryFn: () => base44.entities.Product.filter({ published: true }, '-created_date', 200),
  });

  const favMap = {};
  favorites.forEach(f => { favMap[f.product_id] = f.id; });

  const favProducts = products.filter(p => favMap[p.id]);

  if (loadingFavs || loadingProducts) {
    return <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (favProducts.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border">
        <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
        <p className="font-mono text-xs text-muted-foreground uppercase">No saved favorites yet</p>
        <Link to="/" className="text-primary font-mono text-sm mt-3 inline-block hover:underline">Browse products →</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {favProducts.map(p => (
        <ProductCard key={p.id} product={p} isFavorite={true} favoriteId={favMap[p.id]} />
      ))}
    </div>
  );
}

// ── Orders Tab ────────────────────────────────────────────────────────────────
function OrdersTab({ user }) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['profile-orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border">
        <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
        <p className="font-mono text-xs text-muted-foreground uppercase">No orders yet</p>
        <Link to="/" className="text-primary font-mono text-sm mt-3 inline-block hover:underline">Start shopping →</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(order => {
        const s = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
        return (
          <div key={order.id} className="bg-card border border-border p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] text-muted-foreground uppercase">
                  {new Date(order.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">#{order.id.slice(-8).toUpperCase()}</p>
              </div>
              <span className={`font-mono text-[10px] px-2 py-1 border rounded-sm uppercase ${s.bg} ${s.color}`}>
                {s.label}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {(order.items || []).map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {item.product_image && (
                    <img src={item.product_image} alt={item.product_name} className="w-12 h-12 object-cover border border-border flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      Qty: {item.quantity}{item.options ? ` · ${formatSelection(item.options)}` : item.size ? ` · Size: ${item.size}` : ''}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-bold text-primary flex-shrink-0">{fmt(item.price * item.quantity)} Birr</p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-mono text-xs text-muted-foreground uppercase">Total</span>
              <span className="font-mono font-black text-primary">{fmt(order.total)} Birr</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Account Tab ───────────────────────────────────────────────────────────────
function AccountTab({ user }) {
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    father_name: user?.father_name || '',
    phone: user?.phone || '',
    region: user?.region || '',
    city: user?.city || '',
    specific_address: user?.specific_address || '',
  });

  const cities = form.region ? (REGIONS_CITIES[form.region] || []) : [];
  const set = (k, v) => setForm(f => { const n = { ...f, [k]: v }; if (k === 'region') n.city = ''; return n; });

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    if (form.phone && !PHONE_REGEX.test(form.phone.trim())) {
      toast.error('Enter a valid Ethiopian phone number');
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: form.full_name.trim(),
        father_name: form.father_name.trim(),
        phone: form.phone.trim(),
        region: form.region,
        city: form.city,
        specific_address: form.specific_address.trim(),
        profile_complete: !!(form.phone && form.region && form.city),
      });
      toast.success('Profile saved');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') { toast.error('Please type DELETE to confirm'); return; }
    toast.success('Account deletion requested. You will be logged out.');
    setTimeout(() => base44.auth.logout(), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Personal info */}
      <div className="bg-card border border-border p-5 space-y-4">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <User className="w-3.5 h-3.5" /> Personal Info
        </p>
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Full Name *</label>
          <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} className="bg-secondary border-border h-11" />
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Father's Name</label>
          <Input value={form.father_name} onChange={e => set('father_name', e.target.value)} className="bg-secondary border-border h-11" placeholder="e.g. Abebe" />
        </div>
      </div>

      {/* Shipping */}
      <div className="bg-card border border-border p-5 space-y-4">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5" /> Shipping Address
        </p>
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Phone</label>
          <Input value={form.phone} onChange={e => set('phone', e.target.value)} className="bg-secondary border-border h-11" placeholder="+251 912 345 678" type="tel" />
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Region</label>
          <div className="relative">
            <select value={form.region} onChange={e => set('region', e.target.value)}
              className="w-full bg-secondary border border-border h-11 px-3 text-sm appearance-none outline-none pr-8">
              <option value="">Select region…</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">City / Sub-city</label>
          <div className="relative">
            <select value={form.city} onChange={e => set('city', e.target.value)} disabled={!form.region}
              className="w-full bg-secondary border border-border h-11 px-3 text-sm appearance-none outline-none pr-8 disabled:opacity-50">
              <option value="">{form.region ? 'Select city…' : 'Select region first'}</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Specific Address (optional)</label>
          <Input value={form.specific_address} onChange={e => set('specific_address', e.target.value)} className="bg-secondary border-border h-11" placeholder="e.g. near Edna Mall" />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full h-12 bg-primary text-primary-foreground font-mono font-bold hover:bg-primary/90">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
      </Button>

      {/* Quick links */}
      <div className="bg-card border border-border divide-y divide-border">
        {[
          { label: 'Privacy Policy', path: '/legal/privacy', icon: Shield },
          { label: 'Terms & Conditions', path: '/legal/terms', icon: FileText },
          { label: 'Refund Policy', path: '/legal/refund', icon: RotateCcw },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path} className="flex items-center gap-3 px-5 py-4 hover:bg-secondary/50 transition-colors">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm flex-1">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>

      <Button onClick={() => base44.auth.logout('/')} variant="outline" className="w-full h-12 font-mono border-border">
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>

      {/* Clear activity */}
      <div className="bg-card border border-border p-5 space-y-3">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Recommendations & Privacy</p>
        <p className="text-sm text-muted-foreground">Clear your browsing history and reset your personalized recommendations.</p>
        <Button variant="outline" className="w-full h-11 font-mono border-border"
          onClick={async () => {
            const profiles = await base44.entities.UserBehavior.filter({ user_email: user.email }, null, 1);
            if (profiles[0]) {
              await base44.entities.UserBehavior.update(profiles[0].id, {
                viewed_products: [], purchased_categories: {}, viewed_categories: {},
                search_history: [], wishlist_product_ids: [], price_min: 0, price_max: 0, price_avg: 0,
              });
            }
            sessionStorage.removeItem('_rv');
            toast.success('Activity cleared');
          }}
        >
          Clear My Activity
        </Button>
      </div>

      {/* Delete account */}
      <div className="bg-card border border-destructive/30 p-5 space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4" />
          <p className="font-mono text-xs uppercase tracking-wider font-bold">Danger Zone</p>
        </div>
        <p className="text-sm text-muted-foreground">Deleting your account is permanent.</p>
        {!showDeleteConfirm ? (
          <Button onClick={() => setShowDeleteConfirm(true)} variant="outline" className="w-full h-12 font-mono border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive">
            <Trash2 className="w-4 h-4 mr-2" /> Delete Account
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="font-mono text-xs text-muted-foreground">Type <span className="text-destructive font-bold">DELETE</span> to confirm:</p>
            <Input value={deleteText} onChange={e => setDeleteText(e.target.value)} placeholder="DELETE" className="bg-secondary border-destructive/50 h-12 font-mono" />
            <div className="flex gap-2">
              <Button onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }} variant="outline" className="flex-1 h-11 font-mono border-border">Cancel</Button>
              <Button onClick={handleDeleteAccount} className="flex-1 h-11 font-mono bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm Delete</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Profile Page ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'orders',    label: 'Orders',    icon: Package },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'account',   label: 'Account',   icon: Settings },
];

export default function Profile() {
  const { user } = useAuth();
  const [tab, setTab] = useState('orders');

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Profile" />
      <Navbar />
      <main className="pt-16 pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

          {/* Avatar / header */}
          <div className="flex items-center gap-4 mb-6 p-5 bg-card border border-border">
            <div className="w-14 h-14 bg-primary/10 border border-primary/30 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
              {(user.full_name || user.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{user.full_name || 'No name set'}</p>
              <p className="font-mono text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border mb-6">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 font-mono text-xs uppercase tracking-wider border-b-2 transition-colors -mb-px ${
                    tab === t.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {tab === 'orders'    && <OrdersTab user={user} />}
          {tab === 'favorites' && <FavoritesTab user={user} />}
          {tab === 'account'   && <AccountTab user={user} />}
        </div>
      </main>
    </div>
  );
}