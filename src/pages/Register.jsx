import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  User, Phone, MapPin, ChevronDown, Loader2,
  ArrowRight, ArrowLeft, CheckCircle, Eye, EyeOff
} from 'lucide-react';
import { REGIONS, REGIONS_CITIES } from '@/lib/ethiopiaRegions';

const PHONE_REGEX = /^\+251\s?[79]\d{8}$|^0[79]\d{8}$/;

const STEPS = [
  { label: 'Account',  icon: User },
  { label: 'Location', icon: MapPin },
  { label: 'Done',     icon: CheckCircle },
];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    region: '',
    city: '',
    specific_address: '',
  });

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
    if (!form.email.trim() || !form.email.includes('@')) { toast.error('Valid email is required'); return false; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return false; }
    return true;
  };

  const validateStep1 = () => {
    if (!form.phone.trim()) { toast.error('Phone number is required'); return false; }
    if (!PHONE_REGEX.test(form.phone.trim())) { toast.error('Enter a valid Ethiopian phone number (e.g. +251 912 345 678)'); return false; }
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
    try {
      await base44.auth.register({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
      });

      await base44.auth.updateMe({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        region: form.region,
        city: form.city,
        specific_address: form.specific_address.trim(),
        profile_complete: true,
      });

      setStep(2);
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 100%)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <img
          src="https://media.base44.com/images/public/69e1001a5f1c0bc3344169f5/6811e703c_Gemini_Generated_Image_olhtx9olhtx9olht.png"
          alt="Ethiodo"
          className="h-10 w-10 rounded-full"
          style={{ boxShadow: '0 0 14px rgba(180,255,0,0.4)' }}
        />
        <span className="font-bold text-xl tracking-tight text-white" style={{ textShadow: '0 0 12px rgba(180,255,0,0.3)' }}>
          ETHIODO
        </span>
      </div>

      <div className="w-full max-w-md bg-card border border-border shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border"
          style={{ background: 'linear-gradient(135deg, rgba(180,255,0,0.05) 0%, transparent 100%)' }}>
          <h2 className="font-bold text-lg mb-1">
            {step === 2 ? 'Welcome to Ethiodo!' : 'Create Your Account'}
          </h2>
          <p className="text-muted-foreground text-xs font-mono">
            {step === 2 ? 'Your account is ready.' : "Ethiopia's premier online store"}
          </p>

          {/* Step indicator */}
          {step < 2 && (
            <div className="flex items-center gap-2 mt-4">
              {STEPS.slice(0, 2).map((s, i) => {
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
                    {i < 1 && (
                      <div className={`flex-1 h-0.5 ${i < step ? 'bg-primary' : 'bg-border'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Form content */}
        <div className="px-6 py-5 space-y-4">

          {/* ── STEP 0: Account Info ── */}
          {step === 0 && (
            <>
              <div>
                <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Full Name *</label>
                <Input
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                  className="bg-secondary border-border h-11"
                  placeholder="e.g. Abebe Bekele Tadesse"
                  autoFocus
                />
              </div>
              <div>
                <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Email *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className="bg-secondary border-border h-11"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Password *</label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    className="bg-secondary border-border h-11 pr-10"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground mt-1">At least 8 characters</p>
              </div>
            </>
          )}

          {/* ── STEP 1: Contact & Location ── */}
          {step === 1 && (
            <>
              <div>
                <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Phone Number *</label>
                <Input
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  className="bg-secondary border-border h-11"
                  placeholder="+251 912 345 678"
                  type="tel"
                  autoFocus
                />
                <p className="font-mono text-[10px] text-muted-foreground mt-1">Ethiopian format: +251 9XX XXX XXX or 09XX XXX XXX</p>
              </div>
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
                  Specific Address / Landmark <span className="normal-case opacity-60 text-[10px]">(optional)</span>
                </label>
                <Input
                  value={form.specific_address}
                  onChange={e => set('specific_address', e.target.value)}
                  className="bg-secondary border-border h-11"
                  placeholder="e.g. near Edna Mall, behind Blue Building"
                />
                <p className="font-mono text-[10px] text-muted-foreground mt-1">
                  Helps delivery find you faster
                </p>
              </div>
            </>
          )}

          {/* ── STEP 2: Confirmation ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4 gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <p className="font-mono text-sm text-muted-foreground text-center">Your account has been created successfully!</p>
              </div>
              <div className="bg-secondary/40 border border-border p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground font-mono text-xs">Name</span><span className="font-semibold">{form.full_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground font-mono text-xs">Email</span><span className="font-semibold">{form.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground font-mono text-xs">Phone</span><span className="font-semibold">{form.phone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground font-mono text-xs">Region</span><span className="font-semibold">{form.region}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground font-mono text-xs">City</span><span className="font-semibold">{form.city}</span></div>
                {form.specific_address && (
                  <div className="flex justify-between"><span className="text-muted-foreground font-mono text-xs">Address</span><span className="font-semibold text-right max-w-[200px]">{form.specific_address}</span></div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-6 pt-1 flex gap-3">
          {step === 1 && (
            <button
              onClick={() => setStep(0)}
              className="flex items-center gap-2 h-12 px-5 border border-border text-muted-foreground font-mono text-sm hover:border-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          {step === 0 && (
            <button
              onClick={handleNext}
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-mono font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 1 && (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-mono font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</>
                : <><CheckCircle className="w-4 h-4" /> Complete Registration</>}
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => navigate('/')}
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-mono font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Start Shopping <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Login link */}
        {step < 2 && (
          <div className="px-6 pb-6 text-center">
            <p className="font-mono text-xs text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={() => base44.auth.redirectToLogin(window.location.origin)}
                className="text-primary hover:underline font-semibold"
              >
                Login
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}