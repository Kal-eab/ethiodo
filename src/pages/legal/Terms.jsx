import React from 'react';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import Footer from '@/components/store/Footer';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Terms & Conditions" />
      <Navbar />
      <main className="pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <p className="font-mono text-xs text-primary uppercase tracking-wider mb-3">Legal</p>
          <h1 className="text-4xl font-bold mb-2">Terms & Conditions</h1>
          <p className="text-muted-foreground text-sm mb-10">Last updated: April 2026</p>
          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>By accessing and using Ethiodo, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">2. Use of the Platform</h2>
              <p>You agree to use Ethiodo only for lawful purposes. You may not use the platform to distribute harmful content, attempt unauthorized access, or engage in fraudulent activity.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">3. Orders and Payments</h2>
              <p>All orders are subject to availability and confirmation. We reserve the right to cancel orders in the event of pricing errors or suspected fraud. Prices are listed in USD and are subject to change without notice.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">4. Intellectual Property</h2>
              <p>All content on Ethiodo — including logos, product images, and text — is the property of Ethiodo or its content suppliers. Unauthorized use is prohibited.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">5. Limitation of Liability</h2>
              <p>Ethiodo is not liable for indirect, incidental, or consequential damages resulting from your use of the platform. Our total liability is limited to the amount paid for the order in question.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">6. Changes to Terms</h2>
              <p>We reserve the right to update these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">7. Contact</h2>
              <p>Questions about these terms? Email us at <a href="mailto:support@ethiodo.com" className="text-primary hover:underline">support@ethiodo.com</a>.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}