import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useReveal, useScrollProgress, useTilt } from '@/lib/motion';

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;

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

function formatBirr(price) {
  return `${Number(price).toLocaleString('en-US', { maximumFractionDigits: 2 })} Birr`;
}

// Social proof under the product name. Only states what's true: nothing is
// shown for a product with no reviews or sales rather than a fake "0 sold".
function ProductProof({ product }) {
  const reviews = product.reviewCount || 0;
  const sold = product.totalPurchases || 0;
  if (!reviews && !sold) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
      {reviews > 0 && (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Star className="w-3.5 h-3.5 fill-primary text-primary" />
          <span className="text-foreground font-semibold">{Number(product.averageRating || 0).toFixed(1)}</span>
          <span>({reviews} {reviews === 1 ? 'review' : 'reviews'})</span>
        </span>
      )}
      {sold > 0 && <span className="whitespace-nowrap">{sold} sold</span>}
    </div>
  );
}

// Right side of the hero: the store's best products, one at a time. Clicking the
// card opens the product so the customer can buy it; the arrows, dots and swipe
// move between products. Auto-advances, but pauses while the pointer or
// keyboard focus is on it, and not at all for reduced-motion users.
function FeaturedCarousel({ products }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);
  const revealRef = useReveal();
  const tilt = useTilt({ max: 5 });
  const count = products.length;

  // The list can shrink between renders (e.g. a product is unpublished); never
  // point past its end.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [count, paused]);

  if (!count) return null;
  const go = (delta) => setIndex((i) => (i + delta + count) % count);
  const product = products[Math.min(index, count - 1)];

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(dx < 0 ? 1 : -1);
  };

  const arrowClass =
    'absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-border bg-background/80 backdrop-blur ' +
    'flex items-center justify-center text-foreground hover:border-foreground transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

  return (
    <div
      ref={revealRef}
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Top rated products"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Link
        to={`/product/${product.id}`}
        className="group block"
        aria-label={`${product.name}, ${formatBirr(product.price)} — view product`}
      >
        <div
          ref={tilt.ref}
          onPointerMove={tilt.onPointerMove}
          onPointerLeave={tilt.onPointerLeave}
          className="tilt-card rounded-xl border border-border bg-background p-4 hover:border-white/15"
        >
          <div className="aspect-square rounded-lg overflow-hidden bg-background flex items-center justify-center">
            <img
              key={product.id}
              src={product.images?.[0] || '/placeholder.png'}
              alt={product.name}
              onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
              className="w-full h-full object-contain animate-in fade-in duration-500 transition-transform group-hover:scale-[1.03]"
            />
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {product.category || 'Featured'}
              </p>
              <h3 className="font-semibold text-base mt-0.5 line-clamp-1">{product.name}</h3>
              <ProductProof product={product} />
            </div>
            <span className="font-mono font-semibold text-primary whitespace-nowrap">{formatBirr(product.price)}</span>
          </div>
        </div>
      </Link>

      {count > 1 && (
        <>
          {/* Arrows sit outside the Link so pressing one never opens the product. */}
          <button type="button" onClick={() => go(-1)} aria-label="Previous product" className={`${arrowClass} left-2`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next product" className={`${arrowClass} right-2`}>
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="mt-3 flex justify-center gap-1.5">
            {products.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${p.name}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** @param {{ featuredProducts?: any[], productCount?: number }} props */
export default function Hero({ featuredProducts = [], productCount = 0 }) {
  const scrollToProducts = () => {
    const el = document.getElementById('all-products');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  // Drives the scroll-depth effect (.hero-scroll-copy / .hero-scroll-card).
  const scrollRef = useScrollProgress();
  const copyRevealRef = useReveal();

  return (
    <section ref={scrollRef} className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 pt-2 pb-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        {/* subtle brand glow, kept low so the look stays calm */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(80% 90% at 92% 0%, hsl(var(--primary) / 0.07), transparent 60%)' }}
        />
        <div className="relative grid lg:grid-cols-[1.05fr_.95fr] gap-7 lg:gap-10 p-5 sm:p-8 lg:p-12 items-center">
          {/* Left — message + actions. Scroll depth and the load-in reveal sit on
              separate wrappers because both are transforms. */}
          <div className="hero-scroll-copy">
          <div ref={copyRevealRef}>
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
          </div>

          {/* Right — carousel of the best-rated, best-selling real products */}
          <div className="hero-scroll-card min-w-0">
            <FeaturedCarousel products={featuredProducts} />
          </div>
        </div>
      </div>
    </section>
  );
}
