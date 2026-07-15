import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { CheckCircle, ArrowLeft, MapPin, Pencil, X, Minus, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import PaymentAccounts from '@/components/store/PaymentAccounts';
import ScreenshotUploader from '@/components/store/ScreenshotUploader';
import { REGIONS, REGIONS_CITIES } from '@/lib/ethiopiaRegions';
import { depositAmount } from '@/lib/orderPayment';
import { track } from '@/lib/track';
import { playNotificationSound } from '@/lib/notificationSound';
import { getOptionGroups, unitPrice, selectionImage, shortSelection } from '@/lib/productOptions';

function getParams() {
  const p = new URLSearchParams(window.location.search);
  let options = null;
  const rawOpts = p.get('opts');
  if (rawOpts) {
    try { options = JSON.parse(rawOpts); } catch { options = null; }
  }
  return {
    productId: p.get('product'),
    quantity: parseInt(p.get('qty') || '1', 10),
    size: p.get('size') || null,
    options,
  };
}

const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

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
    await base44.auth.updateMe({ ...form, profile_complete: true });
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
  const { productId, quantity: initialQty, size: initialSize, options: initialOptions } = getParams();
  const [selectedSize] = useState(initialSize);
  const [options] = useState(initialOptions);
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [quantity, setQuantity] = useState(initialQty);
  const [screenshots, setScreenshots] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const sliderRef = useRef(null);
  const [shipping, setShipping] = useState(null);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    if (!user.profile_complete) {
      toast.error('Please complete your profile before ordering.');
      navigate('/register');
      return;
    }
    setShipping({
      phone: user.phone || '',
      region: user.region || '',
      city: user.city || '',
      specific_address: user.specific_address || '',
    });
  }, [isLoadingAuth, user, navigate]);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const items = await base44.entities.Product.filter({ id: productId });
      return items[0];
    },
    enabled: !!productId,
  });

  // Unit price includes any per-variant price_add; the 10% deposit derives
  // from this total unchanged.
  const unit = product ? unitPrice(product, options) : 0;
  const total = unit * quantity;
  const variantImage = product ? selectionImage(product, options) : '';

  const handleSubmit = async () => {
    if (screenshots.length === 0) { toast.error('Please upload a screenshot of your payment'); return; }
    if (!shipping?.phone) { toast.error('Phone number is missing — please edit your address'); return; }
    if (!shipping?.region || !shipping?.city) { toast.error('Shipping address is incomplete — please edit it'); return; }

    setSubmitting(true);
    const shippingAddress = [
      shipping.city, shipping.region, shipping.specific_address
    ].filter(Boolean).join(', ');

    // Look up CustomerReferral for any item in this order
    let matchedReferralId = null;
    try {
      const itemProductIds = [product.id];
      const referrals = await base44.entities.CustomerReferral.filter({
        customer_email: user.email,
        status: 'pending',
      });
      const match = referrals.find(r => itemProductIds.includes(r.product_id));
      if (match) matchedReferralId = match.id;
    } catch {} // ignore lookup failures — order proceeds without referral

    // When there is exactly one option group, keep writing `size` (the chosen
    // label) so old code/exports reading item.size still show something.
    const groups = getOptionGroups(product);
    const legacySize = options
      ? (groups.length === 1 ? Object.values(options)[0] : undefined)
      : (selectedSize || undefined);

    await base44.entities.Order.create({
      items: [{
        product_id: product.id,
        product_name: product.name,
        product_image: variantImage || product.images?.[0] || '',
        price: unit,
        quantity,
        size: legacySize,
        ...(options ? { options } : {}),
      }],
      total,
      status: 'pending',
      payment_proof_screenshots: screenshots,
      payment_proof_url: screenshots[0],
      customer_email: user.email,
      customer_name: user.full_name,
      shipping_address: shippingAddress,
      phone: shipping.phone,
      ...(matchedReferralId ? { matched_referral_id: matchedReferralId } : {}),
    });

    const variantLabel = options ? ` — ${shortSelection(options)}` : '';
    await base44.entities.Notification.create({
      type: 'order',
      content: `New order from ${user.full_name || user.email} — ${fmt(total)} Birr (${product.name}${variantLabel})`,
      link: '/admin/orders',
      is_read: false,
    });

    track.purchase({
      id: Date.now().toString(),
      product_id: product.id,
      product_name: product.name,
      total_amount: total,
    }, product);
    setSubmitting(false);
    playNotificationSound();
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
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link to="/orders"><Button className="w-full bg-primary text-primary-foreground font-mono">View My Orders</Button></Link>
          <Link to="/"><Button variant="outline" className="w-full font-mono border-border">Continue Shopping</Button></Link>
          <Button
            variant="ghost"
            className="w-full font-mono text-muted-foreground text-xs"
            onClick={() => { setDone(false); setScreenshots([]); }}
          >
            ↩ Try Again
          </Button>
        </div>
      </div>
    );
  }

  const hasAddress = shipping.region && shipping.city && shipping.phone;

  // Show the chosen variant's photo first in the product card.
  const displayImages = (() => {
    const imgs = product.images ? [...product.images] : [];
    if (variantImage) {
      const i = imgs.indexOf(variantImage);
      if (i > 0) { imgs.splice(i, 1); imgs.unshift(variantImage); }
      else if (i === -1) imgs.unshift(variantImage);
    }
    return imgs;
  })();

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Place Order" />
      <Navbar />

      <main className="pt-16 pb-8 md:pb-8" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-4 md:py-8">
          <Link to={`/product/${productId}`} className="hidden md:inline-flex items-center gap-2 text-muted-foreground text-sm font-mono mb-8 hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> BACK TO PRODUCT
          </Link>

          {/* ── Product card ── */}
          <div className="bg-card border border-border mb-3 overflow-hidden">
            {displayImages.length > 0 && (
            <div className="relative" style={{ aspectRatio: '4/5', backgroundColor: '#0a0a0a' }}>
            <div
            ref={sliderRef}
            className="flex h-full overflow-x-auto scrollbar-none snap-x snap-mandatory"
            style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
            onScroll={e => {
              const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth);
              setActiveImage(idx);
            }}
            >
            {displayImages.map((img, i) => (
              <div key={i} className="flex-shrink-0 w-full h-full snap-center bg-black/40">
                <img src={img} alt={product.name} className="w-full h-full object-contain" />
              </div>
            ))}
                </div>
                {displayImages.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {displayImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          sliderRef.current?.scrollTo({ left: i * sliderRef.current.clientWidth, behavior: 'smooth' });
                          setActiveImage(i);
                        }}
                        className={`rounded-full transition-all ${i === activeImage ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/50'}`}
                      />
                    ))}
                  </div>
                )}
                {displayImages.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white font-mono text-[10px] px-2 py-0.5 rounded-full">
                    {activeImage + 1}/{displayImages.length}
                  </div>
                )}
              </div>
            )}
            <div className="p-4">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-base leading-tight">{product.name}</h2>
                <p className="font-mono text-xl font-black text-primary flex-shrink-0">{fmt(total)} Birr</p>
              </div>
              {options ? (
                Object.entries(options).map(([group, value]) => (
                  <div key={group} className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="font-mono text-xs text-muted-foreground uppercase">{group}</span>
                    <span className="font-mono font-bold text-sm px-3 py-1 border border-primary text-primary">{value}</span>
                  </div>
                ))
              ) : selectedSize && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="font-mono text-xs text-muted-foreground uppercase">{product?.category === 'phones' ? 'Color' : 'Size'}</span>
                  <span className="font-mono font-bold text-sm px-3 py-1 border border-primary text-primary">{selectedSize}</span>
                </div>
              )}
              <div className={`flex items-center justify-between pt-3 border-t border-border ${(options || selectedSize) ? '' : 'mt-3'}`}>
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

          {/* ── Shipping address ── */}
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

          {/* ── Payment account ── */}
          <div className="mb-4 space-y-3">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Pay to this account</p>
            <PaymentAccounts />
          </div>

          {/* ── Instructions ── */}
          <div className="bg-primary/5 border border-primary/20 p-4 mb-4">
            <p className="font-mono text-xs font-bold text-primary uppercase mb-1">Instructions</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Transfer <strong className="text-foreground">{fmt(depositAmount(total))} Birr</strong> (10% deposit) to the account above, then upload a screenshot of your payment confirmation below.
              The remaining <strong className="text-foreground">{fmt(total - depositAmount(total))} Birr</strong> is paid after your order is delivered.
            </p>
          </div>

          {/* ── Payment screenshot upload ── */}
          <div className="mb-6">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Payment Screenshot *
            </p>
            <ScreenshotUploader screenshots={screenshots} onChange={setScreenshots} />
          </div>

          {/* Desktop submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || screenshots.length === 0 || !hasAddress}
            className="hidden md:flex w-full h-12 bg-primary text-primary-foreground font-mono font-bold text-base hover:bg-primary/90"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
            SUBMIT ORDER — {fmt(total)} Birr
          </Button>
        </div>
      </main>

      {/* ── MOBILE: Sticky bottom submit bar ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={handleSubmit}
          disabled={submitting || screenshots.length === 0 || !hasAddress}
          className="w-full h-14 bg-primary text-primary-foreground font-mono font-bold flex items-center justify-center gap-3 disabled:opacity-50 active:bg-primary/90 transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          <span className="text-sm">SUBMIT ORDER</span>
          <span className="font-black text-base ml-1">{fmt(total)} Birr</span>
        </button>
      </div>
    </div>
  );
}