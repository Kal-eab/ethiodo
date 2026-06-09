import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Send, Upload, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Navbar from '@/components/store/Navbar';

export default function Contact() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) setForm(f => ({ ...f, name: user.full_name || '', email: user.email || '' }));
  }, [user]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await base44.entities.ContactRequest.create({
      name: form.name,
      email: form.email,
      message: form.message,
      image_url: imageUrl || undefined,
      status: 'new',
    });
    setSubmitting(false);
    setSubmitted(true);
    toast.success('Message sent!');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16">
          <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
            <div className="w-16 h-16 bg-accent/10 border-2 border-accent flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-bold">Message Sent</h2>
            <p className="text-muted-foreground text-sm">We'll get back to you shortly.</p>
            <Button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', message: '' }); setImageUrl(''); }} variant="outline" className="font-mono border-border">
              SEND ANOTHER
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold mb-2">Contact Us</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Have a custom request or need help? Send us a message.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Name</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border h-12" required />
            </div>
            <div>
              <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Email</label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-secondary border-border h-12" required />
            </div>
            <div>
              <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Message</label>
              <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="bg-secondary border-border min-h-[120px]" required />
            </div>

            {/* Image upload */}
            <div>
              <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Attach Image (optional)
              </label>
              <label className={`block border border-dashed p-6 text-center cursor-pointer transition-colors ${
                imageUrl ? 'border-accent' : 'border-border hover:border-muted-foreground'
              }`}>
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                ) : imageUrl ? (
                  <img src={imageUrl} alt="Attached" className="max-h-32 mx-auto" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">CLICK TO UPLOAD</span>
                  </div>
                )}
              </label>
            </div>

            <Button
              type="submit"
              disabled={submitting || !form.name || !form.message}
              className="w-full h-12 bg-primary text-primary-foreground font-mono font-bold hover:bg-primary/90"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              SEND MESSAGE
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}