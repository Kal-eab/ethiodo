import React from 'react';
import { ShieldCheck, Truck, HeartHandshake, Star, Users, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import Footer from '@/components/store/Footer';

const values = [
  { icon: ShieldCheck, title: 'Trusted & Secure', desc: 'Every transaction is protected. We verify all sellers and products before listing.' },
  { icon: Truck, title: 'Fast Delivery', desc: 'We partner with reliable couriers to get your order to you quickly and safely.' },
  { icon: HeartHandshake, title: 'Customer First', desc: 'Our support team is always here. Real people, real help — no bots.' },
  { icon: Star, title: 'Quality Curated', desc: 'Only hand-picked, quality-checked products make it onto our shelves.' },
];

const stats = [
  { value: '5,000+', label: 'Happy Customers' },
  { value: '1,200+', label: 'Products Listed' },
  { value: '99%', label: 'Satisfaction Rate' },
  { value: '24/7', label: 'Support Available' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="About Us" />
      <Navbar />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
            <p className="font-mono text-xs text-primary uppercase tracking-[0.3em] mb-4">About Us</p>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
              We are <span className="text-primary">Ethiodo</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              Ethiodo is a curated online marketplace built to connect people with premium products they can trust. 
              We started with a simple mission: make quality shopping accessible, transparent, and enjoyable for everyone.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {stats.map(s => (
                <div key={s.label} className="text-center">
                  <p className="font-mono text-3xl font-bold text-primary">{s.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="font-mono text-xs text-primary uppercase tracking-wider mb-3">Our Mission</p>
                <h2 className="text-3xl font-bold mb-5">Shopping you can trust</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We believe every customer deserves transparency. That's why every product on Ethiodo is reviewed by our 
                  team before going live, and every purchase is backed by our satisfaction guarantee.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  From electronics to everyday essentials, we curate products that meet our quality standards — 
                  so you spend less time second-guessing and more time enjoying what you bought.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {values.map(v => {
                  const Icon = v.icon;
                  return (
                    <div key={v.title} className="bg-card border border-border p-5">
                      <Icon className="w-6 h-6 text-primary mb-3" />
                      <p className="font-semibold text-sm mb-1">{v.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to shop?</h2>
          <p className="text-muted-foreground mb-8">Discover thousands of curated products with fast delivery and trusted quality.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 font-mono text-sm font-medium hover:bg-primary/90 transition-colors">
              Browse Products
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 border border-border px-6 py-3 font-mono text-sm hover:border-muted-foreground transition-colors">
              Contact Us
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}