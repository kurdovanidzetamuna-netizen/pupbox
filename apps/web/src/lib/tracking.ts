/**
 * Ads and analytics in the browser: the visitor's cookie choice, where they
 * came from (ad clicks, campaign tags), and the shop's key moments sent to
 * whichever services admin connected (admin → SEO & tracking): Google
 * Analytics / Tag Manager / Ads, the Meta pixel and the TikTok pixel.
 * Nothing loads and nothing is sent until the visitor accepts.
 */

export type PublicMarketing = {
  verification: { google: string; bing: string; meta: string; yandex: string };
  google: { ga4: string; gtm: string; ads: string; adsLabel: string };
  meta: { pixel: string };
  tiktok: { pixel: string };
  consent: { banner: boolean };
  seo: { hideFromSearch: boolean };
  snippets?: Snippet[];
  /** <meta> tags from admin's pasted head code; the layout writes them into the page itself. */
  metaTags?: { name?: string; property?: string; content: string }[];
};
export type Snippet = { id: string; place: 'head' | 'body-start' | 'body-end'; code: string; consent: boolean };

/** Is any ads or analytics service set up? Without one there's nothing to ask about. */
export const anyTracking = (c: PublicMarketing | null) => !!c && !!(c.google.ga4 || c.google.gtm || c.google.ads || c.meta.pixel || c.tiktok.pixel || c.snippets?.some((x) => x.consent));

// ── The visitor's choice ────────────────────────────────────────────────────
export type Consent = 'all' | 'needed';
const CONSENT = 'pb_consent';
export const COOKIE_EVENT = 'pb:cookies';

export function getConsent(): Consent | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|; )pb_consent=(all|needed)/);
  return m ? (m[1] as Consent) : null;
}
export function setConsent(v: Consent) {
  document.cookie = `${CONSENT}=${v}; path=/; max-age=${180 * 86400}; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
  window.dispatchEvent(new CustomEvent(COOKIE_EVENT, { detail: v }));
}
/** Footer "Cookie settings": show the choice again. */
export const openCookieChoice = () => window.dispatchEvent(new CustomEvent(COOKIE_EVENT, { detail: 'open' }));

// ── Where they came from ────────────────────────────────────────────────────
type Source = { fbc?: string; gclid?: string; ttclid?: string; utm?: Record<string, string>; landing?: string; referrer?: string };
const SOURCE = 'pb_src';

/**
 * The latest ad click or campaign link (an ordinary visit doesn't replace
 * it). Kept for 30 days once the visitor accepted cookies, otherwise only
 * for this visit.
 */
export function rememberSource() {
  try {
    const q = new URLSearchParams(location.search);
    const utm: Record<string, string> = {};
    for (const k of ['source', 'medium', 'campaign', 'content', 'term']) { const v = q.get(`utm_${k}`); if (v) utm[k] = v.slice(0, 160); }
    const fbclid = q.get('fbclid'), gclid = q.get('gclid'), ttclid = q.get('ttclid');
    const external = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer.slice(0, 500) : '';
    if (!fbclid && !gclid && !ttclid && !Object.keys(utm).length && !external) return;
    if (!fbclid && !gclid && !ttclid && !Object.keys(utm).length && readSource()) return; // keep the ad they came from
    const s: Source = {
      ...(fbclid ? { fbc: `fb.1.${Date.now()}.${fbclid.slice(0, 300)}` } : {}),
      ...(gclid ? { gclid: gclid.slice(0, 300) } : {}),
      ...(ttclid ? { ttclid: ttclid.slice(0, 300) } : {}),
      ...(Object.keys(utm).length ? { utm } : {}),
      landing: (location.pathname + location.search).slice(0, 500),
      ...(external ? { referrer: external } : {}),
    };
    const store = getConsent() === 'all' ? localStorage : sessionStorage;
    store.setItem(SOURCE, JSON.stringify({ at: Date.now(), s }));
  } catch { /* storage blocked: nothing to remember */ }
}
function readSource(): Source | null {
  try {
    const raw = localStorage.getItem(SOURCE) || sessionStorage.getItem(SOURCE);
    const v = raw ? JSON.parse(raw) : null;
    return v && Date.now() - v.at < 30 * 86400_000 ? v.s : null;
  } catch { return null; }
}

/** Sent with an order: the cookie choice, the ad click and Meta's browser ID. */
export function trackingForOrder() {
  const consent = getConsent() ?? 'needed';
  const s = readSource() ?? {};
  const cookie = (n: string) => document.cookie.match(new RegExp(`(?:^|; )${n}=([^;]+)`))?.[1];
  const fbp = consent === 'all' ? cookie('_fbp') : undefined;
  const fbc = consent === 'all' ? cookie('_fbc') || s.fbc : undefined;
  return {
    consent,
    ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}),
    ...(s.gclid ? { gclid: s.gclid } : {}), ...(s.ttclid ? { ttclid: s.ttclid } : {}),
    ...(s.utm ? { utm: s.utm } : {}), ...(s.landing ? { landing: s.landing } : {}), ...(s.referrer ? { referrer: s.referrer } : {}),
  };
}

// ── The services ────────────────────────────────────────────────────────────
declare global {
  interface Window { dataLayer?: any[]; gtag?: (...a: any[]) => void; fbq?: any; _fbq?: any; ttq?: any; TiktokAnalyticsObject?: string }
}
let cfg: PublicMarketing | null = null;
let loaded = false;
/** Moments from before the services loaded (a page's own code runs first); sent once they do. */
let pending: [ShopEvent, Parameters<typeof track>[1]][] = [];

function script(src: string) {
  const s = document.createElement('script');
  s.async = true; s.src = src;
  document.head.appendChild(s);
}

const placed = new Set<string>();
/**
 * Puts admin's pasted code on the page (admin → SEO & tracking → Custom
 * code), once each. Scripts added as HTML don't run, so each <script> is
 * rebuilt as a real one.
 */
export function placeSnippets(list: Snippet[]) {
  for (const sn of list) {
    if (placed.has(sn.id)) continue;
    placed.add(sn.id);
    try {
      const tpl = document.createElement('template');
      tpl.innerHTML = sn.code;
      // <meta> tags are already in the page from the server (see [lang]/layout.tsx).
      const nodes = Array.from(tpl.content.childNodes).filter((n) => n.nodeName !== 'META').map((n) => {
        if (n.nodeName !== 'SCRIPT') return n;
        const old = n as HTMLScriptElement, el = document.createElement('script');
        for (const a of Array.from(old.attributes)) el.setAttribute(a.name, a.value);
        el.text = old.text;
        return el;
      });
      const parent = sn.place === 'head' ? document.head : document.body;
      const before = sn.place === 'body-start' ? document.body.firstChild : null;
      for (const n of nodes) parent.insertBefore(n, before);
    } catch { /* broken code from admin never breaks the shop */ }
  }
}

/** Loads every connected service once. Only called after the visitor accepted. */
export function loadTracking(c: PublicMarketing) {
  cfg = c;
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  const g = c.google;
  if (g.ga4 || g.ads || g.gtm) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer!.push(arguments); };
    window.gtag('consent', 'default', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
  }
  if (g.gtm) {
    window.dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    script(`https://www.googletagmanager.com/gtm.js?id=${g.gtm}`);
  }
  if (g.ga4 || g.ads) {
    script(`https://www.googletagmanager.com/gtag/js?id=${g.ga4 || g.ads}`);
    window.gtag!('js', new Date());
    if (g.ga4) window.gtag!('config', g.ga4);
    if (g.ads) window.gtag!('config', g.ads);
  }
  if (c.meta.pixel) {
    const f: any = (window.fbq = function (...a: any[]) { f.callMethod ? f.callMethod(...a) : f.queue.push(a); });
    if (!window._fbq) window._fbq = f;
    f.push = f; f.loaded = true; f.version = '2.0'; f.queue = [];
    script('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', c.meta.pixel);
  }
  if (c.tiktok.pixel) {
    window.TiktokAnalyticsObject = 'ttq';
    const ttq: any = (window.ttq = window.ttq || []);
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    ttq.setAndDefer = (t: any, e: string) => { t[e] = (...a: any[]) => { t.push([e, ...a]); }; };
    for (const m of ttq.methods) ttq.setAndDefer(ttq, m);
    ttq.load = (id: string) => { script(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${id}&lib=ttq`); };
    ttq.load(c.tiktok.pixel);
  }
  placeSnippets((c.snippets ?? []).filter((x) => x.consent));
  const early = pending; pending = [];
  for (const [e, d] of early) track(e, d);
}

export const trackingLoaded = () => loaded;

/** Each page the visitor opens (Google Analytics counts these by itself). */
export function pageView() {
  if (!loaded) return;
  window.fbq?.('track', 'PageView');
  window.ttq?.page?.();
}

/** Basket or order lines as event items: product, plan or a built box. */
export const itemsOf = (lines: any[] = []): EventItem[] => lines.map((i) => ({
  id: i.productId || i.subscriptionPlanId || i.customBoxId || i.id,
  name: i.product?.name || i.subscriptionPlan?.name || i.name || 'Box',
  price: Number(i.price ?? 0),
  quantity: i.quantity || 1,
}));

export type ShopEvent = 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase';
export type EventItem = { id: string; name?: string; price?: number; quantity?: number };
const GOOGLE: Record<ShopEvent, string> = { ViewContent: 'view_item', AddToCart: 'add_to_cart', InitiateCheckout: 'begin_checkout', Purchase: 'purchase' };
const TIKTOK: Record<ShopEvent, string> = { ViewContent: 'ViewContent', AddToCart: 'AddToCart', InitiateCheckout: 'InitiateCheckout', Purchase: 'CompletePayment' };

/**
 * One of the shop's key moments, to every connected service. A purchase
 * carries the order id: Meta pairs it with the same purchase our server
 * reports, and counts it once.
 */
export function track(event: ShopEvent, d: { value: number; items: EventItem[]; orderId?: string }) {
  if (!loaded || !cfg) {
    if (getConsent() !== 'needed' && pending.length < 20) pending.push([event, d]);
    return;
  }
  const value = Math.round(d.value * 100) / 100;
  const ids = d.items.map((i) => i.id);
  const num = d.items.reduce((n, i) => n + (i.quantity ?? 1), 0);
  try {
    window.fbq?.('track', event, { value, currency: 'GEL', content_ids: ids, content_type: 'product', contents: d.items.map((i) => ({ id: i.id, quantity: i.quantity ?? 1 })), num_items: num },
      d.orderId ? { eventID: d.orderId } : undefined);
    const gItems = d.items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity ?? 1 }));
    if (window.gtag && (cfg.google.ga4 || cfg.google.ads)) {
      window.gtag('event', GOOGLE[event], { currency: 'GEL', value, items: gItems, ...(d.orderId ? { transaction_id: d.orderId } : {}) });
      if (event === 'Purchase' && cfg.google.ads && cfg.google.adsLabel) {
        window.gtag('event', 'conversion', { send_to: `${cfg.google.ads}/${cfg.google.adsLabel}`, value, currency: 'GEL', transaction_id: d.orderId });
      }
    }
    if (cfg.google.gtm) {
      window.dataLayer!.push({ ecommerce: null });
      window.dataLayer!.push({ event: GOOGLE[event], ecommerce: { currency: 'GEL', value, items: gItems, ...(d.orderId ? { transaction_id: d.orderId } : {}) } });
    }
    window.ttq?.track?.(TIKTOK[event], { value, currency: 'GEL', contents: d.items.map((i) => ({ content_id: i.id, content_name: i.name, price: i.price, quantity: i.quantity ?? 1 })), content_type: 'product', ...(d.orderId ? { event_id: d.orderId } : {}) });
  } catch { /* a blocked service never breaks the shop */ }
}
