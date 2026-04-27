import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { User, Phone, MapPin, ChevronDown, Loader2, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { REGIONS, REGIONS_CITIES } from '@/lib/ethiopiaRegions';

const PHONE_REGEX = /^\+251\s?[79]\d{8}$|^0[79]\d{8}$/;

const STEPS = [
  { label: 'Personal Info', icon: User },
  { label: 'Address',       icon: MapPin },
];

export default function RegistrationModal({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
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

  const validateStep0 = () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return false; }
    if (!form.phone.trim()) { toast.error('Phone number is required'); return false; }
    if (!PHONE_REGEX.test(form.phone.trim())) {
      toast.error('Enter a valid Ethiopian phone number (e.g. +251 912 345 678)');
      return false;
    }
    return true;
  };

  const validateStep1 = () => {
    if (!form.region) { toast.error('Please select a region'); return false; }
    if (!form.city) { toast.error('Please select a city / sub-city'); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 0 && validateStep0()) setStep(1);
  };

  const handleSubmit = async () => {
    if (!validateStep1()) return;
    setSaving(true);
    await base44.auth.updateMe({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      region: form.region,
      city: form.city,
      specific_address: form.specific_address.trim(),
      profile_complete: true,
    });
    toast.success('Profile saved! Welcome to Ethiodo 🎉');
    setSaving(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4">
      <div className="bg-card border border-border w-full max-w-md shadow-2xl overflow-hidden">

        {/* Top header */}
        <div className="px-6 pt-6 pb-4 border-b border-border"
          style={{ background: 'linear-gradient(135deg, rgba(180,255,0,0.05) 0%, transparent 100%)' }}>
          <div className="flex items-center gap-3 mb-4">
            <img
              src="https://media.base44.com/images/public/69e1001a5f1c0bc3344169f5/6811e703c_Gemini_Generated_Image_olhtx9olhtx9olht.png"
              alt="Ethiodo"
              className="h-8 w-8 rounded-full"
              style={{ boxShadow: '0 0 10px rgba(180,255,0,0.35)' }}
            />
            <div>
              <h2 className="font-bold text-base">Complete Your Profile</h2>
              <p className="text-muted-foreground text-xs font-mono">One-time setup for smooth ordering</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <React.Fragment key={s.label}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                      done ? 'bg-primary border-primary text-primary-foreground' :
                      active ? 'border-primary text-primary bg-primary/10' :
                      'border-border text-muted-foreground'
                    }`}>
                      {done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`font-mono text-[11px] ${active ? 'text-primary font-bold' : done ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 ${i < step ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">

          {step === 0 && (
            <>
              <div>
                <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Full Name *</label>
                <Input
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                  className="bg-secondary border-border h-11"
                  placeholder="e.g. Abebe Bekele"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">
                  Phone Number *
                </label>
                <Input
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  className="bg-secondary border-border h-11"
                  placeholder="+251 912 345 678"
                  type="tel"
                />
                <p className="font-mono text-[10px] text-muted-foreground mt-1">Ethiopian format: +251 9XX XXX XXX or 09XX XXX XXX</p>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">
                  Region *
                </label>
                <div className="relative">
                  <select
                    value={form.region}
                    onChange={e => set('region', e.target.value)}
                    className="w-full bg-secondary border border-border h-11 px-3 text-sm appearance-none outline-none focus:border-primary/50 transition-colors pr-8"
                  >
                    <option value="">Select your region…</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">City / Sub-city *</label>
                <div className="relative">
                  <select
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    disabled={!form.region}
                    className="w-full bg-secondary border border-border h-11 px-3 text-sm appearance-none outline-none focus:border-primary/50 transition-colors pr-8 disabled:opacity-50"
                  >
                    <option value="">{form.region ? 'Select your city…' : 'Select region first'}</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">
                  Specific Address / Landmark <span className="normal-case text-[10px] opacity-60">(optional)</span>
                </label>
                <Input
                  value={form.specific_address}
                  onChange={e => set('specific_address', e.target.value)}
                  className="bg-secondary border-border h-11"
                  placeholder="e.g. near Edna Mall, behind Blue Building"
                />
                <p className="font-mono text-[10px] text-muted-foreground mt-1">A landmark or description to help delivery reach you</p>
              </div>
            </>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-6 pt-2 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 h-12 px-5 border border-border text-muted-foreground font-mono text-sm hover:border-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-mono font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-mono font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle className="w-4 h-4" /> Complete Setup</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}