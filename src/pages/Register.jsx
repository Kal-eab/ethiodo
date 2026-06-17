import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, ChevronDown, Loader2,
  ArrowRight, CheckCircle, LogIn
} from 'lucide-react';
import { REGIONS, REGIONS_CITIES } from '@/lib/ethiopiaRegions';
import { trackSignUp } from '@/lib/analytics';
import InterestPicker from '@/components/register/InterestPicker';
import { resolveCreatorRef } from '@/lib/referral';

const PHONE_REGEX = /^\+251\s?[79]\d{8}$|^0[79]\d{8}$/;

export default function Register() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  // step: 'form' | 'interests' | 'complete'
  const [step, setStep] = useState('form');

  const [form, setForm] = useState({
    phone: '',
    region: '',
    city: '',
    specific_address: '',
  });

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        if (u?.profile_complete) {
          navigate('/');
          return;
        }
        setUser(u);
        if (u) {
          setForm({
            phone: u.phone || '',
            region: u.region || '',
            city: u.city || '',
            specific_address: u.specific_address || '',
          });
        }
      })
      .catch(() => {
        base44.auth.redirectToLogin(window.location.href);
      })
      .finally(() => setLoadingUser(false));
  }, []);

  const cities = form.region ? (REGIONS_CITIES[form.region] || []) : [];

  const set = (key, val) => {
    setForm(f => {
      const next = { ...f, [key]: val };
      if (key === 'region') next.city = '';
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.phone.trim()) { toast.error('Phone number is required'); return; }
    if (!PHONE_REGEX.test(form.phone.trim())) {
      toast.error('Enter a valid Ethiopian phone number (e.g. +251 912 345 678 or 0912 345 678)');
      return;
    }
    if (!form.region) { toast.error('Please select a region'); return; }
    if (!form.city) { toast.error('Please select a city / sub-city'); return; }

    setSaving(true);
    try {
      await base44.auth.updateMe({
        phone: form.phone.trim(),
        region: form.region,
        city: form.city,
        specific_address: form.specific_address.trim(),
        profile_complete: true,
      });
      trackSignUp();

      // Attach creator referral from localStorage if present
      const storedRef = resolveCreatorRef();
      if (storedRef) {
        base44.entities.CustomerReferral.create({
          customer_email: user.email,
          product_id: storedRef.product_id,
          creator_product_link_id: storedRef.link_id,
          status: 'pending',
        }).catch(() => {});
        localStorage.removeItem('ethiodo_creator_ref');
      }

      setStep('interests');
    } catch (err) {
      toast.error(err.message || 'Failed to save. Please try again.');
    }
    setSaving(false);
  };

  // ── Loading ──
  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 100%)' }}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Not logged in ──
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4"
        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 100%)' }}>
        <p className="text-muted-foreground font-mono text-sm">Please log in to continue.</p>
        <button
          onClick={() => base44.auth.redirectToLogin(window.location.href)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-mono font-bold hover:bg-primary/90 transition-colors"
        >
          <LogIn className="w-4 h-4" /> Login
        </button>
      </div>
    );
  }

  // ── Interest picker step ──
  if (step === 'interests') {
    return <InterestPicker user={user} onComplete={() => navigate('/')} />;
  }

  // ── Complete step (fallback — normally interests picker navigates away) ──
  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 100%)' }}>
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="font-mono text-sm text-muted-foreground mb-6">You're all set!</p>
          <button onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-mono font-bold hover:bg-primary/90 transition-colors mx-auto">
            Start Shopping <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Profile form ──
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 100%)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <img
          src="https://media.base44.com/images/public/69e1001a5f1c0bc3344169f5/9143c5b71_Gemini_Generated_Image_gon5mugon5mugon5.png"
          alt="Ethiodo"
          className="h-10 w-10 rounded-full"
          style={{ boxShadow: '0 0 14px rgba(180,255,0,0.4)' }}
        />
        <span className="font-bold text-xl tracking-tight text-white"
          style={{ textShadow: '0 0 12px rgba(180,255,0,0.3)' }}>
          ETHIODO
        </span>
      </div>

      <div className="w-full max-w-md bg-card border border-border shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border"
          style={{ background: 'linear-gradient(135deg, rgba(180,255,0,0.05) 0%, transparent 100%)' }}>
          <h2 className="font-bold text-lg mb-1">Complete Your Profile</h2>
          <p className="text-muted-foreground text-xs font-mono">
            Hi {user.full_name?.split(' ')[0] || 'there'}! We need your delivery info before you can order.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
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
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Ethiopian format: +251 9XX XXX XXX or 09XX XXX XXX
            </p>
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
              Specific Address / Landmark{' '}
              <span className="normal-case opacity-60 text-[10px]">(optional)</span>
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
        </div>

        {/* Footer button */}
        <div className="px-6 pb-6 pt-1">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-mono font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><CheckCircle className="w-4 h-4" /> Save & Continue</>}
          </button>
        </div>
      </div>
    </div>
  );
}