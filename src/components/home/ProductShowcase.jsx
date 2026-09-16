import React, { useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import ProductCard from '@/components/store/ProductCard';
import { useMediaQuery, useReveal, useTilt } from '@/lib/motion';
import { useFavoriteToggle } from '@/lib/useFavoriteToggle';

// A product section rendered as a 3D showroom instead of a flat grid.
//
//   Desktop / laptop (fine pointer): the section pins under the header and the
//     page's vertical scroll drives the products sideways through depth. The
//     product in the middle comes forward; its neighbours recede and angle away,
//     so the row reads as a continuous depth hierarchy rather than a slideshow.
//   Touch (phones, tablets): a native swipe carousel with light depth. No
//     pinning — hijacking vertical scroll on a phone feels trapped.
//   prefers-reduced-motion: the ordinary product grid, no motion at all.
//
// All per-frame work writes transforms/opacity straight onto the DOM from one
// requestAnimationFrame loop that only runs while the section is on screen and
// still moving, so scrolling never re-renders React.
//
// Usage: <ProductShowcase products={products} favorites={favoritesById} />

const PINNED_QUERY = '(min-width: 768px) and (hover: hover) and (pointer: fine)';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** Vertical scroll, in px, that moves the showcase along by one product. */
const SCROLL_PER_PRODUCT = 340;
/** Share of a frame's remaining distance covered per 60fps frame (spring-like ease). */
const SMOOTHING = 0.11;
const MAX_PRODUCTS = 12;
/** Offset of the pinned stage below the fixed navbar + category bar (see Home.jsx). */
const STICKY_TOP = 'calc(var(--navbar-height, 104px) + 44px)';
const STAGE_HEIGHT = 'calc(100svh - var(--navbar-height, 104px) - 44px)';

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const pad = (n) => String(n).padStart(2, '0');

function formatBirr(price) {
  return `${Number(price).toLocaleString('en-US', { maximumFractionDigits: 2 })} Birr`;
}

// ── Card ─────────────────────────────────────────────────────────────────────
// Layered for depth: the card body sits at Z 0, the image floats above it and
// the badges and heart above that. Everything ProductCard offers is kept —
// link, favorite, buy, category, rating, stock — plus units sold.
const ShowcaseCard = React.memo(
  /** @param {{ product: any, isFavorite?: boolean, favoriteId?: any, badge?: { label: string, color: string } | null, index: number, register: (i: number, el: HTMLElement | null) => void, onFocusCard?: (i: number) => void, className?: string }} props */
  function ShowcaseCard({ product, isFavorite, favoriteId, badge = null, index, register, onFocusCard, className = '' }) {
    const navigate = useNavigate();
    const tilt = useTilt({ max: 5 });
    const toggleFavorite = useFavoriteToggle(product, isFavorite, favoriteId);
    const setSlot = useCallback((el) => register(index, el), [register, index]);

    const reviews = product.reviewCount || 0;
    const rating = reviews > 0 ? product.averageRating : product.rating;
    const sold = product.totalPurchases || 0;

    const handleBuy = (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigate(`/product/${product.id}`);
    };

    return (
      <div ref={setSlot} className={`showcase-slot ${className}`} onFocus={() => onFocusCard?.(index)}>
        <div
          ref={tilt.ref}
          onPointerMove={tilt.onPointerMove}
          onPointerLeave={tilt.onPointerLeave}
          className="showcase-card"
        >
          <Link to={`/product/${product.id}`} className="showcase-body group">
            <span aria-hidden="true" className="showcase-shadow" />
            <span aria-hidden="true" className="showcase-glow" />

            <div className="showcase-media">
              <img
                src={product.images?.[0] || '/placeholder.png'}
                alt={product.name}
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                className="showcase-image"
              />
              <div className="absolute inset-x-2 bottom-2 opacity-0 translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-200">
                <button
                  type="button"
                  onClick={handleBuy}
                  className="w-full h-9 rounded-lg bg-background/85 backdrop-blur-md border border-white/15 text-primary font-mono text-[11px] font-semibold hover:bg-background/95 inline-flex items-center justify-center"
                >
                  <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                  BUY NOW
                </button>
              </div>
            </div>

            <span className="showcase-float absolute top-5 left-5 px-2 py-0.5 bg-background/70 backdrop-blur-sm text-[9px] font-mono uppercase tracking-wider text-muted-foreground rounded">
              {product.category}
            </span>
            <button
              type="button"
              onClick={toggleFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="showcase-float absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-full border border-border transition-colors hover:border-white/25"
            >
              <Heart className={`w-4 h-4 transition-transform ${isFavorite ? 'fill-primary text-primary scale-110' : 'text-white/75'}`} />
            </button>

            <div className="showcase-info p-4 pt-3.5 flex flex-col gap-1.5">
              {badge && (
                <span className={`inline-block self-start font-mono text-[9px] px-1.5 py-0.5 border rounded ${badge.color}`}>
                  {badge.label}
                </span>
              )}
              <h3 className="font-medium text-sm leading-snug line-clamp-2 min-h-[2.5em]">{product.name}</h3>
              {(rating > 0 || sold > 0) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                  {rating > 0 && (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Star className="w-3 h-3 fill-primary text-primary" />
                      {Number(rating).toFixed(1)}
                      {reviews > 0 && ` (${reviews})`}
                    </span>
                  )}
                  {sold > 0 && <span className="whitespace-nowrap">{sold} sold</span>}
                </div>
              )}
              <div className="mt-auto pt-1 flex items-baseline justify-between gap-2">
                <span className="font-mono font-semibold text-primary text-base">{formatBirr(product.price)}</span>
                {product.stock > 0 && product.stock <= 5 && (
                  <span className="font-mono text-[9px] text-orange-400 whitespace-nowrap">Only {product.stock} left</span>
                )}
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }
);

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">{title}</h2>
      {subtitle && <span className="hidden sm:inline font-mono text-[10px] text-muted-foreground/60 tracking-wider">· {subtitle}</span>}
    </div>
  );
}

// ── Desktop: pinned scroll-driven gallery ────────────────────────────────────
function PinnedShowcase({ items, renderCard, icon, title }) {
  const n = items.length;
  const outerRef = useRef(/** @type {HTMLElement | null} */ (null));
  const stageRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const atmosphereRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const glowRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const sceneRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const progressRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const counterRef = useRef(/** @type {HTMLSpanElement | null} */ (null));
  const slots = useRef(/** @type {(HTMLElement | null)[]} */ ([]));
  const geometry = useRef({ stickyTop: 0, range: 1 });

  const register = useCallback((i, el) => { slots.current[i] = el; }, []);

  // Keyboard users tab into cards that may be off to the side: scroll the page
  // so the focused product becomes the one in the middle.
  const onFocusCard = useCallback((i) => {
    const outer = outerRef.current;
    if (!outer || n < 2) return;
    const { stickyTop, range } = geometry.current;
    const outerTop = window.scrollY + outer.getBoundingClientRect().top;
    const top = outerTop - stickyTop + (i / (n - 1)) * range;
    if (Math.abs(window.scrollY - top) > 4) window.scrollTo({ top, behavior: 'smooth' });
  }, [n]);

  useEffect(() => {
    const outer = outerRef.current;
    const stage = stageRef.current;
    if (!outer || !stage) return undefined;

    const cur = { a: 0, e: 0 };
    let raf = 0;
    let running = false;
    let visible = false;
    let last = 0;
    let shownIndex = -1;
    // What was last written to the DOM. Scroll events keep arriving while the
    // section is merely near the viewport (targets clamped, nothing moving);
    // re-writing identical styles then would be pure waste on every scroll tick.
    const written = { a: NaN, e: NaN, w: NaN };

    const measure = () => {
      geometry.current = {
        stickyTop: parseFloat(getComputedStyle(stage).top) || 0,
        range: Math.max(outer.offsetHeight - stage.offsetHeight, 1),
      };
    };

    // Where the scene should be for the current scroll position.
    //   a: which product is centred (fractional, 0 … n-1) — pinned-phase progress
    //   e: how far the showroom has "opened" as the section scrolls up to its pin
    const targets = () => {
      const { stickyTop, range } = geometry.current;
      const top = outer.getBoundingClientRect().top;
      const p = clamp((stickyTop - top) / range, 0, 1);
      const e = clamp(1 - (top - stickyTop) / (window.innerHeight * 0.85), 0, 1);
      return { a: p * Math.max(n - 1, 0), e, p };
    };

    const apply = (p) => {
      const width = stage.clientWidth;
      if (Math.abs(cur.a - written.a) < 0.0002 && Math.abs(cur.e - written.e) < 0.0002 && width === written.w) return;
      written.a = cur.a;
      written.e = cur.e;
      written.w = width;
      const spacing = clamp(width * 0.23, 230, 370);
      const entry = 1 - cur.e;

      for (let i = 0; i < n; i++) {
        const el = slots.current[i];
        if (!el) continue;
        const d = i - cur.a;
        const ad = Math.abs(d);
        const near = Math.max(0, 1 - ad); // 1 for the centred product, 0 from one slot away

        // Depth hierarchy: centre forward, neighbours back and angled away.
        // Before the stage is fully open everything sits further back, with
        // later products further still, so they arrive from depth in sequence.
        const x = d * spacing;
        const y = Math.min(ad, 3) * -14 + entry * 70;
        const z = near * 110 - Math.min(ad, 4) * 150 - entry * (380 + Math.min(i, 5) * 70);
        const ry = clamp(-d * 10, -22, 22);
        const rx = entry * 9;
        const opacity = clamp(2.6 - ad, 0, 1) * clamp(cur.e * 1.4 - Math.min(i, 5) * 0.06, 0, 1);

        el.style.transform =
          `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) ` +
          `rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
        // Opacity below 1 flattens an element's 3D children, so leave it unset
        // for fully visible cards to keep their layered depth.
        el.style.opacity = opacity > 0.995 ? '' : opacity.toFixed(3);
        el.style.zIndex = String(1000 - Math.round(ad * 100));
        el.style.pointerEvents = opacity < 0.4 ? 'none' : '';
        el.style.setProperty('--d', clamp(d, -1.5, 1.5).toFixed(3));
        el.style.setProperty('--near', near.toFixed(3));
      }

      if (sceneRef.current) sceneRef.current.style.opacity = cur.e > 0.995 ? '' : cur.e.toFixed(3);
      if (atmosphereRef.current) atmosphereRef.current.style.opacity = cur.e.toFixed(3);
      // The pool of light trails the centred product as it slides out of place.
      if (glowRef.current) {
        const drift = (Math.round(cur.a) - cur.a) * spacing * 0.45;
        glowRef.current.style.transform = `translate3d(${drift.toFixed(1)}px, 0, 0)`;
      }
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${(n > 1 ? p : cur.e).toFixed(4)})`;
      const index = clamp(Math.round(cur.a), 0, n - 1);
      if (counterRef.current && index !== shownIndex) {
        shownIndex = index;
        counterRef.current.textContent = `${pad(index + 1)} / ${pad(n)}`;
      }
    };

    const tick = (now) => {
      const dt = Math.min(now - last, 64);
      last = now;
      const t = targets();
      const k = 1 - Math.pow(1 - SMOOTHING, dt / 16.667);
      cur.a += (t.a - cur.a) * k;
      cur.e += (t.e - cur.e) * k;
      const settled = Math.abs(t.a - cur.a) < 0.0008 && Math.abs(t.e - cur.e) < 0.0008;
      if (settled) {
        cur.a = t.a;
        cur.e = t.e;
      }
      apply(n > 1 ? cur.a / (n - 1) : t.p);
      if (settled || !visible) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!visible || running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      stage.toggleAttribute('data-live', visible);
      if (visible) kick();
    }, { rootMargin: '25% 0px' });
    io.observe(outer);

    const onResize = () => { measure(); kick(); };

    measure();
    const initial = targets();
    cur.a = initial.a;
    cur.e = initial.e;
    apply(initial.p);

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', onResize);
    };
  }, [n]);

  // Pinned for one stage-height plus enough scroll to walk through every
  // product, plus a short settle so the last product can rest centred.
  const outerHeight = `calc(${STAGE_HEIGHT} + ${Math.max(n - 1, 0) * SCROLL_PER_PRODUCT}px + 30svh)`;

  return (
    <section ref={outerRef} className="showcase-pinned relative" style={{ height: outerHeight }} aria-label={title}>
      <div ref={stageRef} className="showcase-stage sticky overflow-hidden" style={{ top: STICKY_TOP, height: STAGE_HEIGHT }}>
        <div ref={atmosphereRef} aria-hidden="true" className="showcase-atmosphere" style={{ opacity: 0 }}>
          <div ref={glowRef} className="showcase-spotlight" />
          <div className="showcase-floor" />
        </div>
        <div aria-hidden="true" className="showcase-vignette" />

        <div className="relative z-10 max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 pt-5 flex items-center justify-between">
          <SectionTitle icon={icon} title={title} subtitle={n > 1 ? 'scroll to explore' : null} />
          <span ref={counterRef} className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {`01 / ${pad(n)}`}
          </span>
        </div>

        <div ref={sceneRef} className="showcase-scene">
          {items.map((item, i) => renderCard(item, i, register, onFocusCard))}
        </div>

        {n > 1 && (
          <div aria-hidden="true" className="absolute bottom-6 left-1/2 -translate-x-1/2 w-40 h-px bg-border overflow-hidden rounded-full">
            <div ref={progressRef} className="h-full w-full bg-primary origin-left" style={{ transform: 'scaleX(0)' }} />
          </div>
        )}
      </div>
    </section>
  );
}

// ── Touch: swipe carousel with light depth ───────────────────────────────────
function TouchShowcase({ items, renderCard, icon, title }) {
  const n = items.length;
  const scrollerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const counterRef = useRef(/** @type {HTMLSpanElement | null} */ (null));
  const slots = useRef(/** @type {(HTMLElement | null)[]} */ ([]));
  const revealRef = useReveal();
  const register = useCallback((i, el) => { slots.current[i] = el; }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    let raf = 0;
    let centers = [];
    let step = 1;
    let shownIndex = -1;

    const measure = () => {
      centers = slots.current.map((el) => (el ? el.offsetLeft + el.offsetWidth / 2 : 0));
      step = centers.length > 1 ? Math.max(centers[1] - centers[0], 1) : Math.max(slots.current[0]?.offsetWidth || 1, 1);
    };

    const apply = () => {
      raf = 0;
      const mid = scroller.scrollLeft + scroller.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < n; i++) {
        const el = slots.current[i];
        if (!el) continue;
        const d = (centers[i] - mid) / step;
        const ad = Math.abs(d);
        if (ad < bestDist) { bestDist = ad; best = i; }
        el.style.transform =
          `perspective(700px) translate3d(0, 0, ${(-Math.min(ad, 2) * 45).toFixed(1)}px) ` +
          `rotateY(${clamp(-d * 7, -12, 12).toFixed(2)}deg) scale(${(1 - Math.min(ad, 1) * 0.05).toFixed(4)})`;
        el.style.opacity = ad < 0.02 ? '' : (1 - Math.min(ad, 1.5) * 0.22).toFixed(3);
        el.style.setProperty('--d', clamp(d, -1.5, 1.5).toFixed(3));
        el.style.setProperty('--near', Math.max(0, 1 - ad).toFixed(3));
      }
      if (counterRef.current && best !== shownIndex) {
        shownIndex = best;
        counterRef.current.textContent = `${pad(best + 1)} / ${pad(n)}`;
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const onResize = () => { measure(); schedule(); };

    measure();
    apply();
    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
    };
  }, [n]);

  return (
    <section className="showcase-touch relative max-w-[140rem] mx-auto py-4" aria-label={title}>
      <div className="px-3 sm:px-6 mb-3 flex items-center justify-between">
        <SectionTitle icon={icon} title={title} subtitle={n > 1 ? 'swipe' : null} />
        <span ref={counterRef} className="font-mono text-[11px] text-muted-foreground tabular-nums">{`01 / ${pad(n)}`}</span>
      </div>
      <div ref={revealRef}>
        <div ref={scrollerRef} className="showcase-scroller">
          {items.map((item, i) => renderCard(item, i, register, null))}
        </div>
      </div>
    </section>
  );
}

// ── Public component ─────────────────────────────────────────────────────────
/**
 * @param {{
 *   products: any[],
 *   favorites?: Record<string, any>,
 *   getBadge?: (product: any) => ({ label: string, color: string } | null),
 *   title?: string,
 *   icon?: React.ReactNode,
 * }} props
 */
export default function ProductShowcase({ products, favorites = {}, getBadge, title = 'Products', icon = null }) {
  const pinned = useMediaQuery(PINNED_QUERY);
  const reduced = useMediaQuery(REDUCED_QUERY);
  const items = (products || []).slice(0, MAX_PRODUCTS);
  if (!items.length) return null;

  if (reduced) {
    return (
      <section className="max-w-[140rem] mx-auto px-3 sm:px-6 lg:px-8 py-4" aria-label={title}>
        <div className="mb-4"><SectionTitle icon={icon} title={title} /></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
          {items.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              isFavorite={!!favorites[p.id]}
              favoriteId={favorites[p.id]}
              badge={getBadge ? getBadge(p) : null}
            />
          ))}
        </div>
      </section>
    );
  }

  const renderCard = (p, i, register, onFocusCard) => (
    <ShowcaseCard
      key={p.id}
      product={p}
      index={i}
      register={register}
      onFocusCard={onFocusCard}
      isFavorite={!!favorites[p.id]}
      favoriteId={favorites[p.id]}
      badge={getBadge ? getBadge(p) : null}
    />
  );

  const Variant = pinned ? PinnedShowcase : TouchShowcase;
  return <Variant items={items} renderCard={renderCard} icon={icon} title={title} />;
}
