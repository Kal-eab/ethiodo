import React, { useState } from 'react';
import { Mail, Phone, MessageCircle, MapPin, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import { Link } from 'react-router-dom';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    await base44.entities.ContactRequest.create({
      name: form.name,
      email: form.email,
      message: `Subject: ${form.subject}\n\n${form.message}`,
      status: 'new',
    });
    toast.success('Message sent! We'll reply shortly.');
    setSent(true);
    setSending(false);
  };

  const contacts = [
    { icon: Mail, label: 'Email', value: 'support@ethiodo.com', href: 'mailto:support@ethiodo.com' },
    { icon: Phone, label: 'Phone', value: '+1 (555) 000-0000', href: 'tel:+15550000000' },
    { icon: MessageCircle, label: 'WhatsApp', value: 'Chat on WhatsApp', href: 'https://wa.me/15550000000' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <section className="border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
            <p className="font-mono text-xs text-primary uppercase tracking-[0.3em] mb-4">Contact</p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Get in Touch</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Have a question, issue, or just want to say hi? We're here and respond within a few hours.
            </p>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {/* Contact info */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <h2 className="font-bold text-lg mb-1">Contact Info</h2>
                <p className="text-sm text-muted-foreground">Reach us on any of these channels.</p>
              </div>
              {contacts.map(c => {
                const Icon = c.icon;
                return (
                  <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-card border border-border hover:border-primary/50 transition-colors group">
                    <div className="w-10 h-10 bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono text-xs text-muted-foreground uppercase">{c.label}</p>
                      <p className="text-sm font-medium">{c.value}</p>
                    </div>
                  </a>
                );
              })}
              <div className="p-4 bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Response Time</p>
                <p>We typically reply within 2–4 hours during business hours (Mon–Fri, 9am–6pm).</p>
              </div>
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-2">Or use our live chat:</p>
                <Link to="/messages" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 font-mono text-xs font-medium hover:bg-primary/90 transition-colors">
                  <MessageCircle className="w-4 h-4" /> Open Chat
                </Link>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-3">
              {sent ? (
                <div className="bg-card border border-border p-10 text-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
                  <p className="text-muted-foreground text-sm">We've received your message and will get back to you shortly.</p>
                  <Button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                    variant="outline" className="mt-6 border-border font-mono">
                    Send Another
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSend} className="bg-card border border-border p-6 space-y-4">
                  <h2 className="font-bold text-lg mb-2">Send a Message</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Name</label>
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="bg-secondary border-border h-11" />
                    </div>
                    <div>
                      <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Email</label>
                      <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="bg-secondary border-border h-11" />
                    </div>
                  </div>
                  <div>
                    <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Subject</label>
                    <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required className="bg-secondary border-border h-11" />
                  </div>
                  <div>
                    <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Message</label>
                    <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required rows={5} className="bg-secondary border-border resize-none" />
                  </div>
                  <Button type="submit" disabled={sending} className="w-full h-11 bg-primary text-primary-foreground font-mono hover:bg-primary/90">
                    {sending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send Message</>}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}