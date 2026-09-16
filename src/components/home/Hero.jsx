import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Calm storefront hero for the Home page (shown only on the default, unfiltered
// view). Features a real product from the catalog and states the genuine
// delivery/deposit model — no invented "stats", since this is a live store.
function ValueProp({ label, value }) {
  return (
    <div>
      <div className="text-lg sm:text-xl font-bold leading-none">{value}</div>
      <div className="font-mono text-[11px] text-muted-foreground tracking-wide mt-1.5">{label}</div>
    </div>
  );
}

/** @param {{ featuredProduct?: any, productCount?: number }} props */
export default function Hero({ featuredProduct, productCount = 0 }) {
  const scrollToProducts = () => {
    const el = document.getElementById('all-products');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const fp = featuredProduct;

  return (
    <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 pt-2 pb-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        {/* subtle brand glow, kept low so the look stays calm */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(80% 90% at 92% 0%, hsl(var(--primary) / 0.07), transparent 60%)' }}
        />
        <div className="relative grid lg:grid-cols-[1.05fr_.95fr] gap-7 lg:gap-10 p-5 sm:p-8 lg:p-12 items-center">
          {/* Left — message + actions */}
          <div>
            <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Free delivery in Addis · Pay 10% to reserve
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.06] tracking-tight text-balance">
              Everything you want,{' '}
              <span className="text-primary">delivered to your door.</span>
            </h1>
            <p className="mt-4 text-muted-foreground max-w-[46ch] text-sm sm:text-base leading-relaxed">
              Electronics, fashion and more — imported and delivered across Ethiopia.
              Reserve with a 10% deposit and pay the rest when it arrives.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={scrollToProducts}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition"
              >
                Shop now <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/orders"
                className="inline-flex items-center h-12 px-6 rounded-lg border border-border text-foreground font-medium text-sm hover:border-foreground transition-colors"
              >
                Track my order
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
              {productCount > 0 && <ValueProp label="Products" value={`${productCount}+`} />}
              <ValueProp label="Deposit to reserve" value="10%" />
              <ValueProp label="Rest paid" value="On delivery" />
            </div>
          </div>

          {/* Right — a real featured product */}
          {fp && (
            <Link to={`/product/${fp.id}`} className="group block">
              <div className="rounded-xl border border-border bg-background p-4 transition-all duration-300 hover:border-white/15 hover:-translate-y-1">
                <div className="aspect-square rounded-lg overflow-hidden bg-background flex items-center justify-center">
                  <img
                    src={fp.images?.[0] || '/placeholder.png'}
                    alt={fp.name}
                    onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{fp.category || 'Featured'}</p>
                    <h3 className="font-semibold text-base mt-0.5 line-clamp-1">{fp.name}</h3>
                  </div>
                  <span className="font-mono font-semibold text-primary whitespace-nowrap">
                    {Number(fp.price).toLocaleString('en-US', { maximumFractionDigits: 2 })} Birr
                  </span>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
