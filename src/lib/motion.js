// Scroll and pointer driven 3D effects for the storefront, built on browser
// APIs rather than an animation library: the store is used largely on phones
// over slow connections, and these few effects don't justify ~40KB of JS.
//
// Every effect is progressive: the attribute that hides an element before it
// animates in is only ever added from JavaScript, so if JS fails or
// IntersectionObserver is missing, content simply shows up without animation
// instead of staying invisible. Reduced-motion users get no motion at all.
import { useCallback, useEffect, useRef } from 'react';

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// ── Reveal on scroll ─────────────────────────────────────────────────────────
// One observer shared by every element on the page. The Home grid can hold
// 200+ cards, and an observer per card would multiply that bookkeeping.
let revealObserver = null;
const STAGGER_MS = 70;
const MAX_STAGGER_MS = 350;

function getRevealObserver() {
  if (revealObserver || typeof IntersectionObserver === 'undefined') return revealObserver;
  revealObserver = new IntersectionObserver(
    (entries) => {
      // Elements that cross into view in the same callback — typically one row
      // of the grid — cascade in one after another rather than all at once.
      let order = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = /** @type {HTMLElement} */ (entry.target);
        el.style.setProperty('--reveal-delay', `${Math.min(order * STAGGER_MS, MAX_STAGGER_MS)}ms`);
        el.dataset.revealed = 'true';
        revealObserver.unobserve(el);
        order += 1;
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  return revealObserver;
}

/** Ref callback: the element rises and tips up into place when scrolled into view. */
export function useReveal() {
  const nodeRef = useRef(/** @type {HTMLElement | null} */ (null));
  const ref = useCallback((node) => {
    const observer = getRevealObserver();
    if (nodeRef.current && observer) observer.unobserve(nodeRef.current);
    nodeRef.current = node;
    if (!node || !observer || prefersReducedMotion()) return;
    // Remounted nodes that already played keep their revealed state.
    if (node.dataset.revealed) return;
    node.dataset.reveal = '';
    observer.observe(node);
  }, []);
  return ref;
}

// ── Pointer tilt ─────────────────────────────────────────────────────────────
const MAX_TILT_DEG = 7;

function canHoverPrecisely() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Tilts an element toward the cursor in 3D, with a glare that follows it.
 * Writes CSS variables straight onto the element (once per animation frame) so
 * moving the mouse never re-renders React. Touch devices are left untouched —
 * there is no hover to follow, and tilting under a finger fights scrolling.
 * @param {{ max?: number }} [options]
 */
export function useTilt({ max = MAX_TILT_DEG } = {}) {
  const ref = useRef(/** @type {HTMLElement | null} */ (null));
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onPointerMove = useCallback((e) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse' || !canHoverPrecisely() || prefersReducedMotion()) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = (clientX - r.left) / r.width; // 0 … 1
      const y = (clientY - r.top) / r.height;
      el.dataset.tilting = '';
      el.style.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    });
  }, [max]);

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    cancelAnimationFrame(frame.current);
    if (!el) return;
    delete el.dataset.tilting;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}

// ── Scroll progress ──────────────────────────────────────────────────────────
/**
 * Publishes how far an element has scrolled up past the top of the viewport as
 * `--scroll-p` (0 when its top is at the top of the screen, 1 once it has
 * scrolled fully out). CSS turns that into 3D transforms. The work happens at
 * most once per frame, and only while the element is on screen.
 */
export function useScrollProgress() {
  const ref = useRef(/** @type {HTMLElement | null} */ (null));

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return undefined;

    let frame = 0;
    let visible = true;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(Math.max(-r.top / Math.max(r.height, 1), 0), 1);
      el.style.setProperty('--scroll-p', p.toFixed(4));
    };
    const onScroll = () => {
      if (visible && !frame) frame = requestAnimationFrame(update);
    };

    let io = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) onScroll();
      });
      io.observe(el);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      io?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return ref;
}
