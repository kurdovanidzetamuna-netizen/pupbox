'use client';
import { useEffect } from 'react';
import { usePath } from '@/lib/path';

/**
 * Makes every page a little more alive as you scroll: sections and headings
 * rise in as they reach the screen, and cards in a grid or list come in one
 * after another. One component for the whole site (mounted in the layout),
 * so no page has to wrap its sections by hand, and content that loads later
 * (shop products, your dogs, orders) gets it too.
 *
 * Rules that keep it safe:
 * - Only things still below the screen are ever hidden, so nothing you can
 *   already see blinks on load, refresh or when a list re-renders.
 * - Skips forms, pop-ups, the header, and anything with a pinned (fixed or
 *   sticky) part — a moving parent would drag those along.
 * - Skips anything inside its own scrolling area (a swipe row on phones, the
 *   build-a-box product panel): those are browsed, not scrolled past.
 * - Once played, the classes come off, so nothing keeps a transform.
 * - Off entirely for people who ask their device for less motion.
 * - Leaves decorations laid over other things (a switch's sliding highlight) alone.
 * - If React re-renders an element's class, it simply shows: failing visible.
 */
const TARGETS = [
  'main section',
  'main h2',
  'main .grid > *',
  'main ul > li',
  'footer .grid > *',
].join(',');
const SKIP = 'header, nav, form, aside, [role="dialog"], [data-no-reveal], .fixed, .sticky';
const ITEM = 'main .grid > *, main ul > li, footer .grid > *';

/** Inside a sideways swipe row or a panel with its own scrollbar. */
function inScroller(el: HTMLElement) {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (/(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflowY)) return true;
  }
  return false;
}

export default function ScrollReveal() {
  const pathname = usePath();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver((entries) => {
      // Things that arrive together play one after another.
      const shown = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      shown.forEach((el, i) => {
        io.unobserve(el);
        el.style.setProperty('--rv-delay', `${Math.min(i, 6) * 70}ms`);
        el.classList.remove('rv');
        el.classList.add('rv-go');
        const done = () => { el.classList.remove('rv-go', 'rv-item', 'rv-block'); el.style.removeProperty('--rv-delay'); };
        // Only its own animation: a child's (a bobbing pup) bubbles up here too.
        const onEnd = (e: AnimationEvent) => { if (e.target === el) { el.removeEventListener('animationend', onEnd); done(); } };
        el.addEventListener('animationend', onEnd);
        setTimeout(done, 1600); // in case the animation never ends (hidden tab)
      });
    }, { threshold: 0 });

    // Remembered here, not on the element: React still owns the page's
    // attributes while it finishes loading, and an extra one makes it warn.
    const seen = new WeakSet<HTMLElement>();
    const take = (el: HTMLElement) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (el.closest(SKIP) || el.querySelector('.fixed, .sticky, form')) return;
      // Decorations laid over something else (a switch's sliding highlight) move with it, never on their own.
      if (el.getAttribute('aria-hidden') === 'true' || getComputedStyle(el).position === 'absolute') return;
      // A section whose cards animate on their own doesn't move as a block too.
      if (el.tagName === 'SECTION' && el.querySelector(ITEM.replace(/main |footer /g, ''))) return;
      // Already on screen (or above it), or off to the side: leave it exactly as it is.
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight || r.left >= window.innerWidth || r.right <= 0) return;
      if (inScroller(el)) return;
      el.classList.add('rv', el.matches(ITEM) ? 'rv-item' : 'rv-block');
      io.observe(el);
    };
    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(TARGETS)) take(root);
      root.querySelectorAll<HTMLElement>(TARGETS).forEach(take);
    };

    // Only once the page has loaded and React has finished taking it over:
    // marking something React hasn't reached yet makes it warn.
    // New content (a list that loaded, the next page) gets the same treatment.
    let queued: Node[] = [];
    let raf = 0;
    const mo = new MutationObserver((records) => {
      records.forEach((r) => r.addedNodes.forEach((n) => { if (n.nodeType === 1) queued.push(n); }));
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; const q = queued; queued = []; q.forEach((n) => scan(n as ParentNode)); });
    });
    const begin = () => { scan(document); mo.observe(document.body, { childList: true, subtree: true }); };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => { timer = setTimeout(begin, 350); };
    if (document.readyState === 'complete') settle(); else window.addEventListener('load', settle, { once: true });

    return () => {
      io.disconnect(); mo.disconnect(); cancelAnimationFrame(raf); clearTimeout(timer); window.removeEventListener('load', settle);
      // Never leave anything hidden behind.
      document.querySelectorAll('.rv').forEach((el) => el.classList.remove('rv', 'rv-item', 'rv-block'));
    };
  }, [pathname]);

  return null;
}
