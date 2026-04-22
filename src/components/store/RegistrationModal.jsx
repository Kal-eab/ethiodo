import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { User, Phone, MapPin, ChevronDown, Loader2 } from 'lucide-react';
import { REGIONS, REGIONS_CITIES } from '@/lib/ethiopiaRegions';

const PHONE_REGEX = /^\+251\s?[79]\d{8}$|^0[79]\d{8}$/;

export default function RegistrationModal({ user, onComplete }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    father_name: '',
    phone: '',
    region: '',
    city: '',
    specific_address: '',
  });
  const [saving, setSaving] = useState(false);

  const cities = form.region ? (REGIONS_CITIES[form.region] || []) : [];

  const set = (key, val) => {
    setForm(f => {
      const next = { ...f, [key]: val };
      if (key === 'region') next.city = '';
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    if (!form.father_name.trim()) { toast.error("Father's name is required"); return; }
    if (!form.phone.trim()) { toast.error('Phone number is required'); return; }
    if (!PHONE_REGEX.test(form.phone.trim())) {
      toast.error('Enter a valid Ethiopian phone number (e.g. +251 912 345 678)');
      return;
    }
    if (!form.region) { toast.error('Please select a region'); return; }
    if (!form.city) { toast.error('Please select a city / sub-city'); return; }

    setSaving(true);
    await base44.auth.updateMe({
      full_name: form.full_name.trim(),
      father_name: form.father_name.trim(),
      phone: form.phone.trim(),
      region: form.region,
      city: form.city,
      specific_address: form.specific_address.trim(),
      profile_complete: true,
    });
    toast.success('Profile saved! You can now place orders.');
    setSaving(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-card border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 border border-primary/30 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Complete Your Profile</h2>
              <p className="text-muted-foreground text-xs font-mono">One-time setup — saved for future orders</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Full name */}
          <div>
            <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Full Name *</label>
            <Input
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              className="bg-secondary border-border h-11"
              placeholder="Your full name"
            />
          </div>

          {/* Father's name */}
          <div>
            <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Father's Name *</label>
            <Input
              value={form.father_name}
              onChange={e => set('father_name', e.target.value)}
              className="bg-secondary border-border h-11"
              placeholder="e.g. Abebe"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Phone Number *</span>
            </label>
            <Input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className="bg-secondary border-border h-11"
              placeholder="+251 912 345 678"
              type="tel"
            />
            <p className="font-mono text-[10px] text-muted-foreground mt-1">Ethiopian format: +251 9XX XXX XXX</p>
          </div>

          {/* Region */}
          <div>
            <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Region *</span>
            </label>
            <div className="relative">
              <select
                value={form.region}
                onChange={e => set('region', e.target.value)}
                className="w-full bg-secondary border border-border h-11 px-3 text-sm appearance-none outline-none focus:border-primary/50 transition-colors pr-8"
              >
                <option value="">Select region…</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">City / Sub-city *</label>
            <div className="relative">
              <select
                value={form.city}
                onChange={e => set('city', e.target.value)}
                disabled={!form.region}
                className="w-full bg-secondary border border-border h-11 px-3 text-sm appearance-none outline-none focus:border-primary/50 transition-colors pr-8 disabled:opacity-50"
              >
                <option value="">{form.region ? 'Select city…' : 'Select region first'}</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Specific address */}
          <div>
            <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Specific Address / Landmark <span className="normal-case text-[10px]">(optional)</span></label>
            <Input
              value={form.specific_address}
              onChange={e => set('specific_address', e.target.value)}
              className="bg-secondary border-border h-11"
              placeholder="e.g. near Edna Mall, behind XYZ building"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-12 bg-primary text-primary-foreground font-mono font-bold hover:bg-primary/90 mt-2"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : 'Save & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}