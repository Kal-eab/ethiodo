import React from 'react';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import Footer from '@/components/store/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Privacy Policy" />
      <Navbar />
      <main className="pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <p className="font-mono text-xs text-primary uppercase tracking-wider mb-3">Legal</p>
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm mb-10">Last updated: April 2026</p>
          <div className="prose prose-invert prose-sm max-w-none space-y-8 text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">1. Information We Collect</h2>
              <p>We collect information you provide when creating an account, placing an order, or contacting support — including your name, email address, shipping address, and payment details. We also collect usage data such as pages visited and actions taken on the site.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">2. How We Use Your Information</h2>
              <p>Your information is used to process orders, deliver products, send order updates, provide customer support, and improve our services. We do not sell your personal data to third parties.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">3. Data Security</h2>
              <p>We use industry-standard encryption and security practices to protect your data. Payment information is processed through secure, PCI-compliant payment processors and is never stored on our servers.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">4. Cookies</h2>
              <p>We use cookies to maintain your session, remember your preferences, and improve your browsing experience. You can disable cookies in your browser settings, though some features may not function properly.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">5. Your Rights</h2>
              <p>You have the right to access, correct, or delete your personal data at any time. Contact us at support@ethiodo.com to make a request.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">6. Contact</h2>
              <p>For privacy-related inquiries, contact us at <a href="mailto:support@ethiodo.com" className="text-primary hover:underline">support@ethiodo.com</a>.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}