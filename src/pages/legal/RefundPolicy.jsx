import React from 'react';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <p className="font-mono text-xs text-primary uppercase tracking-wider mb-3">Legal</p>
          <h1 className="text-4xl font-bold mb-2">Refund & Return Policy</h1>
          <p className="text-muted-foreground text-sm mb-10">Last updated: April 2026</p>
          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">1. Return Eligibility</h2>
              <p>Items may be returned within <strong className="text-foreground">14 days</strong> of delivery, provided they are unused, in original packaging, and in the same condition received. Items marked as "Final Sale" are not eligible for return.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">2. How to Initiate a Return</h2>
              <p>Contact our support team at <a href="mailto:support@ethiodo.com" className="text-primary hover:underline">support@ethiodo.com</a> or use the live chat on the site. Include your order number and reason for return. We'll provide return instructions within 24 hours.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">3. Refund Process</h2>
              <p>Once your return is received and inspected, we will notify you of approval or rejection. Approved refunds are processed within <strong className="text-foreground">5–7 business days</strong> to your original payment method.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">4. Damaged or Wrong Items</h2>
              <p>If you received a damaged, defective, or incorrect item, contact us immediately with photos. We will send a replacement or issue a full refund at no cost to you, including return shipping.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">5. Non-Returnable Items</h2>
              <p>The following cannot be returned: digital products, perishable goods, hygiene items opened/used, and items explicitly marked non-returnable on their product page.</p>
            </section>
            <section>
              <h2 className="text-foreground text-xl font-semibold mb-3">6. Shipping Costs</h2>
              <p>Return shipping is the customer's responsibility unless the item is faulty or incorrectly sent. Original shipping fees are non-refundable unless the return is due to our error.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}