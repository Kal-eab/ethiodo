import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { CheckCircle, ArrowLeft, CreditCard, Smartphone, MapPin, Pencil, X, Minus, Plus, Loader2, Upload, GripVertical, ImageIcon, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import { REGIONS, REGIONS_CITIES } from '@/lib/ethiopiaRegions';
import { track } from '@/lib/track';

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    productId: p.get('product'),
    quantity: parseInt(p.get('qty') || '1', 10),
    size: p.get('size') || null,
  };
}

const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const PAYMENT_ACCOUNTS = [
  {
    icon: CreditCard,
    label: 'Bank Transfer (CBE)',
    details: [
      { key: 'Account Name', value: 'Kaleab Mamo', copyable: false },
      { key: 'Account Number', value: '1000518281287', copyable: true },
    ],
  },
];

// ─── Copyable row ─────────────────────────────────────────────────────────────
function CopyableRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground font-mono text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold select-all">{value}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded font-mono text-[10px] transition-all"
          style={copied
            ? { background: 'rgba(72,255,72,0.12)', color: 'hsl(157,100%,50%)', border: '1px solid rgba(72,255,72,0.3)' }
            : { background: 'rgba(180,255,0,0.08)', color: 'hsl(72,100%,50%)', border: '1px solid rgba(180,255,0,0.25)' }
          }
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

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

// ─── Draggable screenshot uploader ───────────────────────────────────────────
function ScreenshotUploader({ screenshots, onChange }) {
  const [uploading, setUploading] = useState(false);
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of Array.from(files)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      onChange([...screenshots, ...urls]);
    } catch (err) {
      toast.error('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const removeScreenshot = (idx) => {
    onChange(screenshots.filter((_, i) => i !== idx));
  };

  const handleDragStart = (idx) => { dragItem.current = idx; };
  const handleDragEnter = (idx) => { dragOver.current = idx; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const arr = [...screenshots];
    const dragged = arr.splice(dragItem.current, 1)[0];
    arr.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;
    onChange(arr);
  };

  return (
    <div className="space-y-3">
      {/* Uploaded screenshots — draggable row */}
      {screenshots.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {screenshots.map((url, i) => (
            <div
              key={url}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className="relative flex-shrink-0 w-24 h-24 border overflow-hidden cursor-grab active:cursor-grabbing select-none"
              style={{ borderColor: i === 0 ? 'hsl(72,100%,50%)' : undefined }}
            >
              <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground font-mono text-[8px] text-center py-0.5">
                  FIRST
                </div>
              )}
              {/* Drag handle hint */}
              <div className="absolute top-1 left-1 opacity-60">
                <GripVertical className="w-3 h-3 text-white drop-shadow" />
              </div>
              <button
                type="button"
                onClick={() => removeScreenshot(i)}
                className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <label className="flex items-center justify-center gap-2 h-12 border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-secondary/40">
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="font-mono text-xs text-muted-foreground">Uploading…</span></>
        ) : (
          <><Upload className="w-4 h-4 text-muted-foreground" /><span className="font-mono text-xs text-muted-foreground">Upload payment screenshot(s)</span></>
        )}
      </label>

      {screenshots.length > 1 && (
        <p className="font-mono text-[10px] text-muted-foreground">Drag images left/right to reorder — first image is shown first.</p>
      )}
    </div>
  );
}

export default function DirectPayment() {
  const { productId, quantity: initialQty, size: initialSize } = getParams();
  const [selectedSize] = useState(initialSize);
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

  const total = product ? product.price * quantity : 0;

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

    await base44.entities.Order.create({
      items: [{
        product_id: product.id,
        product_name: product.name,
        product_image: product.images?.[0] || '',
        price: product.price,
        quantity,
        size: selectedSize || undefined,
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

    await base44.entities.Notification.create({
      type: 'order',
      content: `New order from ${user.full_name || user.email} — ${fmt(total)} Birr (${product.name})`,
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
            {product.images?.length > 0 && (
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
            {product.images.map((img, i) => (
              <div key={i} className="flex-shrink-0 w-full h-full snap-center bg-black/40">
                <img src={img} alt={product.name} className="w-full h-full object-contain" />
              </div>
            ))}
                </div>
                {product.images.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {product.images.map((_, i) => (
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
                {product.images.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white font-mono text-[10px] px-2 py-0.5 rounded-full">
                    {activeImage + 1}/{product.images.length}
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
              {selectedSize && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="font-mono text-xs text-muted-foreground uppercase">{product?.category === 'phones' ? 'Color' : 'Size'}</span>
                  <span className="font-mono font-bold text-sm px-3 py-1 border border-primary text-primary">{selectedSize}</span>
                </div>
              )}
              <div className={`flex items-center justify-between pt-3 border-t border-border ${selectedSize ? '' : 'mt-3'}`}>
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
            {PAYMENT_ACCOUNTS.map(acc => {
              const Icon = acc.icon;
              return (
                <div key={acc.label} className="bg-card border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">{acc.label}</span>
                  </div>
                  <div className="space-y-2">
                    {acc.details.map(d => (
                      d.copyable
                        ? <CopyableRow key={d.key} label={d.key} value={d.value} />
                        : <div key={d.key} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-mono text-xs">{d.key}</span>
                            <span className="font-semibold">{d.value}</span>
                          </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Instructions ── */}
          <div className="bg-primary/5 border border-primary/20 p-4 mb-4">
            <p className="font-mono text-xs font-bold text-primary uppercase mb-1">Instructions</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Transfer <strong className="text-foreground">{fmt(Math.round(total * 0.1))} Birr</strong> (10% deposit) to the account above, then upload a screenshot of your payment confirmation below.
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