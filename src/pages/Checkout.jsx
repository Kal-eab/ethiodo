import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, Check, ArrowLeft, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import Navbar from '@/components/store/Navbar';

export default function Checkout() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [paymentProof, setPaymentProof] = useState(null);
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
  });

  useEffect(() => {
    base44.auth.me().then(user => {
      setForm(f => ({ ...f, name: user.full_name || '', email: user.email || '' }));
    }).catch(() => {});
  }, []);

  const productMap = {};
  products.forEach(p => { productMap[p.id] = p; });

  const cartWithProducts = cartItems.map(item => ({
    ...item,
    product: productMap[item.product_id],
  })).filter(item => item.product);

  const total = cartWithProducts.reduce(
    (sum, item) => sum + (item.product.price || 0) * (item.quantity || 1), 0
  );

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setPaymentProof(file);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setProofUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!proofUrl) {
      toast.error('Please upload payment proof');
      return;
    }
    setSubmitting(true);
    const orderItems = cartWithProducts.map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      product_image: item.product.images?.[0] || '',
      price: item.product.price,
      quantity: item.quantity || 1,
    }));

    await base44.entities.Order.create({
      items: orderItems,
      total,
      status: 'pending',
      payment_proof_url: proofUrl,
      customer_email: form.email,
      customer_name: form.name,
      shipping_address: form.address,
      phone: form.phone,
    });

    // Clear cart
    for (const item of cartItems) {
      await base44.entities.CartItem.delete(item.id);
    }
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    setSubmitting(false);
    toast.success('Order placed successfully!');
    navigate('/orders');
  };

  const steps = [
    { num: 1, label: 'Details' },
    { num: 2, label: 'Payment' },
    { num: 3, label: 'Confirm' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <Link to="/cart" className="inline-flex items-center gap-2 text-muted-foreground text-sm font-mono mb-8 hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> BACK TO CART
          </Link>

          {/* Stepper */}
          <div className="flex items-center gap-1 mb-10">
            {steps.map((s, i) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 flex items-center justify-center font-mono text-xs border-2 ${
                    step >= s.num ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                  }`}>
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`font-mono text-xs uppercase tracking-wider hidden sm:block ${
                    step >= s.num ? 'text-foreground' : 'text-muted-foreground'
                  }`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? 'bg-primary' : 'bg-border'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Shipping Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Full Name</label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border h-12" />
                </div>
                <div>
                  <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Email</label>
                  <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-secondary border-border h-12" />
                </div>
                <div>
                  <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Phone</label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-secondary border-border h-12" />
                </div>
                <div>
                  <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Shipping Address</label>
                  <Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="bg-secondary border-border min-h-[100px]" />
                </div>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!form.name || !form.email || !form.address}
                className="w-full h-12 bg-primary text-primary-foreground font-mono font-bold hover:bg-primary/90"
              >
                CONTINUE <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Payment Proof */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Upload Payment Proof</h2>
              <p className="text-muted-foreground text-sm">
                Please complete your payment and upload a screenshot as proof.
              </p>

              {/* Order summary */}
              <div className="bg-card border border-border p-4 space-y-2">
                <p className="font-mono text-xs text-muted-foreground uppercase">Amount Due</p>
                <p className="font-mono text-3xl font-bold text-primary">${total.toFixed(2)}</p>
              </div>

              {/* Upload zone */}
              <label className={`block border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                proofUrl ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground'
              }`}>
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="font-mono text-xs text-muted-foreground">UPLOADING...</p>
                  </div>
                ) : proofUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <img src={proofUrl} alt="Payment proof" className="max-h-48 mx-auto border border-border" />
                      <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground w-6 h-6 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="font-mono text-xs text-accent uppercase">SECURED — Click to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="font-mono text-sm text-muted-foreground">DROP PAYMENT SCREENSHOT HERE</p>
                    <p className="font-mono text-xs text-muted-foreground">or click to browse</p>
                  </div>
                )}
              </label>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 font-mono border-border">
                  <ArrowLeft className="w-4 h-4 mr-2" /> BACK
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!proofUrl}
                  className="flex-1 h-12 bg-primary text-primary-foreground font-mono font-bold hover:bg-primary/90"
                >
                  CONTINUE <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Confirm Order</h2>

              <div className="bg-card border border-border p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground uppercase mb-1">Name</p>
                    <p>{form.name}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground uppercase mb-1">Email</p>
                    <p>{form.email}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground uppercase mb-1">Phone</p>
                    <p>{form.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground uppercase mb-1">Address</p>
                    <p>{form.address}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="font-mono text-xs text-muted-foreground uppercase mb-3">Items</p>
                  {cartWithProducts.map(item => (
                    <div key={item.id} className="flex justify-between text-sm py-1">
                      <span>{item.product.name} ×{item.quantity || 1}</span>
                      <span className="font-mono">${((item.product.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 flex justify-between">
                  <span className="font-mono uppercase font-bold">Total</span>
                  <span className="font-mono text-2xl font-bold text-primary">${total.toFixed(2)}</span>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="font-mono text-xs text-muted-foreground uppercase mb-2">Payment Proof</p>
                  <img src={proofUrl} alt="Payment proof" className="max-h-32 border border-border" />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 font-mono border-border">
                  <ArrowLeft className="w-4 h-4 mr-2" /> BACK
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 h-12 bg-primary text-primary-foreground font-mono font-bold hover:bg-primary/90"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  PLACE ORDER
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}