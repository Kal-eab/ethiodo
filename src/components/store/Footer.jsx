import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 mt-16">
      {/* Trust badges */}
      <div className="border-b border-border">
        <div className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: ShieldCheck, title: 'Secure Checkout', desc: '256-bit SSL encryption' },
              { icon: Truck, title: 'Fast Delivery', desc: 'Tracked shipping on every order' },
            ].map(b => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{b.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-4">Shop</p>
            <div className="space-y-2">
              <Link to="/" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">All Products</Link>
              <Link to="/favorites" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Favorites</Link>
              <Link to="/orders" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">My Orders</Link>
            </div>
          </div>
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-4">Company</p>
            <div className="space-y-2">
              <Link to="/about" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">About Us</Link>
              <Link to="/contact" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
              <Link to="/messages" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Live Chat</Link>
            </div>
          </div>
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-4">Support</p>
            <div className="space-y-2">
              <Link to="/orders" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Track Order</Link>
              <Link to="/legal/refund" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Returns & Refunds</Link>
              <Link to="/messages" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Help Center</Link>
            </div>
          </div>
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-4">Legal</p>
            <div className="space-y-2">
              <Link to="/legal/privacy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/legal/terms" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Terms & Conditions</Link>
              <Link to="/legal/refund" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Refund Policy</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="https://media.base44.com/images/public/69e1001a5f1c0bc3344169f5/6811e703c_Gemini_Generated_Image_olhtx9olhtx9olht.png" alt="Ethiodo" className="h-6 w-auto" />
            <span className="font-bold text-sm">Ethiodo</span>
          </div>
          <p className="font-mono text-xs text-muted-foreground">© 2026 Ethiodo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}