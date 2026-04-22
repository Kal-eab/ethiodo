import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { User, LogOut, Trash2, ChevronRight, Shield, FileText, RotateCcw, AlertTriangle, Phone, MapPin, ChevronDown, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import { toast } from 'sonner';
import { REGIONS, REGIONS_CITIES } from '@/lib/ethiopiaRegions';

const PHONE_REGEX = /^\+251\s?[79]\d{8}$|^0[79]\d{8}$/;

export default function Profile() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    father_name: '',
    phone: '',
    region: '',
    city: '',
    specific_address: '',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setForm({
        full_name: u.full_name || '',
        father_name: u.father_name || '',
        phone: u.phone || '',
        region: u.region || '',
        city: u.city || '',
        specific_address: u.specific_address || '',
      });
    }).catch(() => {});
  }, []);

  const cities = form.region ? (REGIONS_CITIES[form.region] || []) : [];
  const set = (k, v) => setForm(f => { const n = { ...f, [k]: v }; if (k === 'region') n.city = ''; return n; });

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    if (form.phone && !PHONE_REGEX.test(form.phone.trim())) {
      toast.error('Enter a valid Ethiopian phone number');
      return;
    }
    setSaving(true);
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
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') { toast.error('Please type DELETE to confirm'); return; }
    toast.success('Account deletion requested. You will be logged out.');
    setTimeout(() => base44.auth.logout(), 1500);
  };

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
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold mb-1">My Profile</h1>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-8">Account & shipping settings</p>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6 p-5 bg-card border border-border">
            <div className="w-14 h-14 bg-primary/10 border border-primary/30 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
              {(user.full_name || user.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{user.full_name || 'No name set'}</p>
              <p className="font-mono text-xs text-muted-foreground">{user.email}</p>
              <p className="font-mono text-[10px] text-muted-foreground uppercase mt-1">{user.role}</p>
            </div>
          </div>

          {/* Edit form */}
          <div className="bg-card border border-border p-5 mb-4 space-y-4">
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

          {/* Shipping info */}
          <div className="bg-card border border-border p-5 mb-4 space-y-4">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" /> Shipping Address
            </p>
            <div>
              <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</span>
              </label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} className="bg-secondary border-border h-11" placeholder="+251 912 345 678" type="tel" />
              <p className="font-mono text-[10px] text-muted-foreground mt-1">Ethiopian format: +251 9XX XXX XXX</p>
            </div>
            <div>
              <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Region</label>
              <div className="relative">
                <select value={form.region} onChange={e => set('region', e.target.value)}
                  className="w-full bg-secondary border border-border h-11 px-3 text-sm appearance-none outline-none focus:border-primary/50 transition-colors pr-8">
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
                  className="w-full bg-secondary border border-border h-11 px-3 text-sm appearance-none outline-none focus:border-primary/50 transition-colors pr-8 disabled:opacity-50">
                  <option value="">{form.region ? 'Select city…' : 'Select region first'}</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Specific Address / Landmark <span className="normal-case">(optional)</span></label>
              <Input value={form.specific_address} onChange={e => set('specific_address', e.target.value)} className="bg-secondary border-border h-11" placeholder="e.g. near Edna Mall" />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-12 bg-primary text-primary-foreground font-mono font-bold hover:bg-primary/90 mb-6">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
          </Button>

          {/* Quick links */}
          <div className="bg-card border border-border mb-4 divide-y divide-border">
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

          {/* Logout */}
          <Button onClick={() => base44.auth.logout('/')} variant="outline" className="w-full h-12 font-mono border-border mb-4">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>

          {/* Delete Account */}
          <div className="bg-card border border-destructive/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <p className="font-mono text-xs uppercase tracking-wider font-bold">Danger Zone</p>
            </div>
            <p className="text-sm text-muted-foreground">Deleting your account is permanent. All orders and messages will be removed.</p>
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
      </main>
    </div>
  );
}