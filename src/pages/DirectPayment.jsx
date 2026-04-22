import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, CheckCircle, ArrowLeft, ShieldCheck, CreditCard, Smartphone, MapPin, Phone, Pencil, X, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import { REGIONS, REGIONS_CITIES } from '@/lib/ethiopiaRegions';

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return { productId: p.get('product'), quantity: parseInt(p.get('qty') || '1', 10) };
}

const PAYMENT_ACCOUNTS = [
  {
    icon: CreditCard,
    label: 'Bank Transfer',
    details: [
      { key: 'Bank', value: 'Commercial Bank of Ethiopia' },
      { key: 'Account Name', value: 'Ethiodo Store' },
      { key: 'Account Number', value: '1000123456789' },
    ],
  },
  {
    icon: Smartphone,
    label: 'Mobile Money (Telebirr)',
    details: [
      { key: 'Name', value: 'Ethiodo Store' },
      { key: 'Number', value: '+251 9XX XXX XXXX' },
    ],
  },
];

// ─── Inline address editor ────────────────────────────────────────────────────
function AddressEditor({ user, onSave, onCancel }) {
  const [form, setForm] = useState({
    phone: user?.phone || '',
    region: user?.region || '',
    city: user?.city || '',
    specific_address: user?.specific_address || '',
  });
  const [saving, setSaving] = useState(false);

  const cities = form.region ? (REGIONS_CITIES[form.region] || []) : [];
  const set = (k, v) => setForm(f => { const n = { ...f, [k]: v }; if (k === 'region') n.city = ''; return n; });

  const handleSave = async () => {
    if (!form.phone) { toast.error('Phone is required'); return; }
    if (!form.region) { toast.error('Region is required'); return; }
    if (!form.city) { toast.error('City is required'); return; }
    setSaving(true);
    await base44.auth.updateMe({ ...form });
    toast.success('Address updated');
    setSaving(false);
    onSave(form);
  };

  return (
    <div className="bg-card border border-primary/40 p-5 space-y-3 mb-6">
      <div className="flex items-center justify-between mb-1">
        <p className="font-mono text-xs text-primary uppercase tracking-wider font-bold">Edit Shipping Info</p>
        <button onClick={onCancel}><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>
      <div>
        <label className="font-mono text-xs text-muted-foreground block mb-1">Phone *</label>
        <Input value={form.phone} onChange={e => set('phone', e.target.value)} className="bg-secondary border-border h-10" placeholder="+251 9XX XXX XXX" />
      </div>
      <div>
        <label className="font-mono text-xs text-muted-foreground block mb-1">Region *</label>
        <select value={form.region} onChange={e => set('region', e.target.value)}
          className="w-full bg-secondary border border-border h-10 px-3 text-sm appearance-none outline-none">
          <option value="">Select region…</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="font-mono text-xs text-muted-foreground block mb-1">City / Sub-city *</label>
        <select value={form.city} onChange={e => set('city', e.target.value)} disabled={!form.region}
          className="w-full bg-secondary border border-border h-10 px-3 text-sm appearance-none outline-none disabled:opacity-50">
          <option value="">{form.region ? 'Select city…' : 'Select region first'}</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="font-mono text-xs text-muted-foreground block mb-1">Specific Address</label>
        <Input value={form.specific_address} onChange={e => set('specific_address', e.target.value)} className="bg-secondary border-border h-10" placeholder="Landmark / building" />
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm hover:bg-primary/90">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Address
      </Button>
    </div>
  );
}

export default function DirectPayment() {
  const { productId, quantity: initialQty } = getParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [quantity, setQuantity] = useState(initialQty);
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  // shipping snapshot (might differ from profile if user edits inline)
  const [shipping, setShipping] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setShipping({
        phone: u.phone || '',
        region: u.region || '',
        city: u.city || '',
        specific_address: u.specific_address || '',
      });
    }).catch(() => {
      base44.auth.redirectToLogin(window.location.href);
    });
  }, []);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const items = await base44.entities.Product.filter({ id: productId });
      return items[0];
    },
    enabled: !!productId,
  });

  const total = product ? product.price * quantity : 0;
  const unitPrice = product ? product.price : 0;

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setProofUrl(file_url);
    setUploading(false);
    toast.success('Screenshot uploaded!');
  };

  const handleSubmit = async () => {
    if (!proofUrl) { toast.error('Please upload your payment screenshot first'); return; }
    if (!shipping?.phone) { toast.error('Phone number is missing — please edit your address'); return; }
    if (!shipping?.region || !shipping?.city) { toast.error('Shipping address is incomplete — please edit it'); return; }

    setSubmitting(true);
    const shippingAddress = [
      shipping.city, shipping.region, shipping.specific_address
    ].filter(Boolean).join(', ');

    await base44.entities.Order.create({
      items: [{
        product_id: product.id,
        product_name: product.name,
        product_image: product.images?.[0] || '',
        price: product.price,
        quantity,
      }],
      total,
      status: 'pending',
      payment_proof_url: proofUrl,
      customer_email: user.email,
      customer_name: user.full_name,
      shipping_address: shippingAddress,
      phone: shipping.phone,
    });

    await base44.entities.Notification.create({
      type: 'order',
      content: `New order from ${user.full_name || user.email} — $${total.toFixed(2)} (${product.name})`,
      link: '/admin/orders',
      is_read: false,
    });

    setSubmitting(false);
    setDone(true);
  };

  if (isLoading || !user || !shipping) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center">
          <p className="font-mono text-muted-foreground">Product not found.</p>
          <Link to="/" className="text-primary text-sm mt-4 block">← Back to shop</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center gap-6">
        <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Order Received!</h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            We've received your payment screenshot and will confirm your order shortly.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/orders"><Button className="bg-primary text-primary-foreground font-mono">View My Orders</Button></Link>
          <Link to="/"><Button variant="outline" className="font-mono border-border">Continue Shopping</Button></Link>
        </div>
      </div>
    );
  }

  const hasAddress = shipping.region && shipping.city && shipping.phone;

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Place Order" />
      <Navbar />

      {/* Extra bottom padding on mobile so content isn't hidden behind sticky bar */}
      <main className="pt-16 pb-8 md:pb-8" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-4 md:py-8">
          <Link to={`/product/${productId}`} className="hidden md:inline-flex items-center gap-2 text-muted-foreground text-sm font-mono mb-8 hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> BACK TO PRODUCT
          </Link>



          {/* ── Product card — full-width image + info + qty (same on mobile & desktop) ── */}
          <div className="bg-card border border-border mb-3 overflow-hidden">
            {product.images?.[0] && (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full object-cover"
                style={{ aspectRatio: '4/5' }}
              />
            )}
            <div className="p-4">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-base leading-tight">{product.name}</h2>
                <p className="font-mono text-xl font-black text-primary flex-shrink-0">${total.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="font-mono text-xs text-muted-foreground uppercase">Quantity</span>
                <div className="flex items-center gap-0 border border-border overflow-hidden">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-mono font-bold bg-secondary h-10 flex items-center justify-center">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Shipping address — same on mobile & desktop ── */}
          <div className="mb-3">
            {editingAddress ? (
              <AddressEditor
                user={{ ...user, ...shipping }}
                onSave={(updated) => { setShipping(updated); setEditingAddress(false); }}
                onCancel={() => setEditingAddress(false)}
              />
            ) : (
              <div className="bg-card border border-border p-4 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm">{user.full_name}</span>
                    <span className="font-mono text-sm text-muted-foreground">{shipping.phone || <span className="text-destructive text-xs">No phone</span>}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {hasAddress
                      ? [shipping.city, shipping.region, shipping.specific_address].filter(Boolean).join(', ')
                      : <span className="text-destructive">⚠ Address incomplete — tap Edit</span>
                    }
                  </p>
                </div>
                <button onClick={() => setEditingAddress(true)} className="flex items-center gap-1 text-xs text-primary font-mono flex-shrink-0 hover:underline">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              </div>
            )}
          </div>

          {/* Payment accounts — both mobile & desktop */}
          <div className="mb-4 space-y-3">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Pay to one of these accounts</p>
            {PAYMENT_ACCOUNTS.map(acc => {
              const Icon = acc.icon;
              return (
                <div key={acc.label} className="bg-card border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">{acc.label}</span>
                  </div>
                  <div className="space-y-1.5">
                    {acc.details.map(d => (
                      <div key={d.key} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-mono text-xs">{d.key}</span>
                        <span className="font-semibold select-all">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Instructions */}
          <div className="bg-primary/5 border border-primary/20 p-4 mb-4">
            <p className="font-mono text-xs font-bold text-primary uppercase mb-1">Instructions</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pay <strong className="text-foreground">${total.toFixed(2)}</strong> to one of the accounts above, then take a screenshot of the confirmation and upload it below.
            </p>
          </div>

          {/* Screenshot upload */}
          <div className="mb-6">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-3">Upload Payment Screenshot *</p>
            <label className={`block border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              proofUrl ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
            }`}>
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  <p className="font-mono text-xs text-muted-foreground">UPLOADING...</p>
                </div>
              ) : proofUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={proofUrl} alt="Payment screenshot" className="max-h-48 mx-auto border border-border" />
                  <p className="font-mono text-xs text-primary uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Uploaded — tap to replace
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-7 h-7 text-muted-foreground" />
                  <p className="font-mono text-sm text-muted-foreground">Tap to upload screenshot</p>
                  <p className="font-mono text-xs text-muted-foreground">JPG, PNG accepted</p>
                </div>
              )}
            </label>
          </div>

          {/* Desktop submit button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading || !proofUrl || !hasAddress}
            className="hidden md:flex w-full h-12 bg-primary text-primary-foreground font-mono font-bold text-base hover:bg-primary/90"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
            SUBMIT ORDER — ${total.toFixed(2)}
          </Button>
        </div>
      </main>

      {/* ── MOBILE ONLY: Sticky bottom submit bar ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={handleSubmit}
          disabled={submitting || uploading || !proofUrl || !hasAddress}
          className="w-full h-14 bg-primary text-primary-foreground font-mono font-bold flex items-center justify-center gap-3 disabled:opacity-50 active:bg-primary/90 transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          <span className="text-sm">SUBMIT ORDER</span>
          <span className="font-black text-base ml-1">${total.toFixed(2)}</span>
        </button>
      </div>
    </div>
  );
}