/**
 * Ads and analytics in the browser: the visitor's cookie choice (per group:
 * analytics, ads), where they came from (ad clicks, campaign tags), and the
 * shop's key moments sent to whichever services admin connected (admin →
 * SEO & tracking): Google Analytics / Tag Manager / Ads, the Meta pixel and
 * the TikTok pixel. Nothing loads and nothing is sent until the visitor
 * says yes to that group.
 */

export type PublicMarketing = {
  verification: { google: string; bing: string; meta: string; yandex: string };
  google: { ga4: string; gtm: string; ads: string; adsLabel: string };
  meta: { pixel: string };
  tiktok: { pixel: string };
  consent: { banner: boolean; always?: boolean; version?: number; policy?: string; texts?: { ka?: Record<string, string>; en?: Record<string, string> } };
  seo: { hideFromSearch: boolean };
  snippets?: Snippet[];
  /** <meta> tags from admin's pasted head code; the layout writes them into the page itself. */
  metaTags?: { name?: string; property?: string; content: string }[];
};
export type Snippet = { id: string; place: 'head' | 'body-start' | 'body-end'; code: string; consent: boolean; category?: Group };

/** Is any ads or analytics service set up? */
export const anyTracking = (c: PublicMarketing | null) => !!c && !!(c.google.ga4 || c.google.gtm || c.google.ads || c.meta.pixel || c.tiktok.pixel || c.snippets?.some((x) => x.consent));
/** Does the site ask about cookies: the banner is on, and set to show to everyone or something tracks. */
export const asksAboutCookies = (c: PublicMarketing | null) => !!c && c.consent.banner && (c.consent.always !== false || anyTracking(c));

// ── The visitor's choice ────────────────────────────────────────────────────
export type Group = 'analytics' | 'ads';
export type Consent = Record<Group, boolean>;
export type Choice = 'all' | 'needed' | 'custom';
const CONSENT = 'pb_consent';
export const COOKIE_EVENT = 'pb:cookies';
/** The banner's version (admin → "Ask everyone again" raises it); an answer to an older one doesn't count. */
let version = 1;
export const setConsentVersion = (v: number | undefined) => { version = v && v > 0 ? v : 1; };
const cookieOpts = (days: number) => `path=/; max-age=${days * 86400}; samesite=lax${typeof location !== 'undefined' && location.protocol === 'https:' ? '; secure' : ''}`;

/** The visitor's answer: pb_consent=a1m0v3 (analytics yes, ads no, banner version 3). Older "all"/"needed" count as version 1. */
export function getConsent(): Consent | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie.match(/(?:^|; )pb_consent=([^;]+)/)?.[1];
  if (!raw) return null;
  if (raw === 'all' || raw === 'needed') return version === 1 ? { analytics: raw === 'all', ads: raw === 'all' } : null;
  const m = raw.match(/^a([01])m([01])v(\d+)$/);
  return m && Number(m[3]) === version ? { analytics: m[1] === '1', ads: m[2] === '1' } : null;
}
/** A random ID for this browser, so the answer can be kept as proof (no name, email or IP). */
function visitorId() {
  let id = document.cookie.match(/(?:^|; )pb_vid=([A-Za-z0-9-]{8,64})/)?.[1];
  if (!id) {
    id = (crypto as any).randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    document.cookie = `pb_vid=${id}; ${cookieOpts(365)}`;
  }
  return id!;
}
export function setConsent(c: Consent, choice: Choice, apiUrl?: string) {
  document.cookie = `${CONSENT}=a${c.analytics ? 1 : 0}m${c.ads ? 1 : 0}v${version}; ${cookieOpts(180)}`;
  window.dispatchEvent(new CustomEvent(COOKIE_EVENT, { detail: c }));
  if (apiUrl) {
    try {
      fetch(`${apiUrl}/marketing/consent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ visitorId: visitorId(), choice, analytics: c.analytics, ads: c.ads, version, lang: document.documentElement.lang === 'en' ? 'en' : 'ka', path: location.pathname.slice(0, 300) }),
      }).catch(() => {});
    } catch { /* proof not kept this time; the choice still works */ }
  }
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
    const c = getConsent();
    const store = c?.ads || c?.analytics ? localStorage : sessionStorage;
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

/** Sent with an order: the cookie choice ("all" = ads allowed, so our server may tell Meta), the ad click and Meta's browser ID. */
export function trackingForOrder() {
  const ads = !!getConsent()?.ads;
  const consent = ads ? 'all' : 'needed';
  const s = readSource() ?? {};
  const cookie = (n: string) => document.cookie.match(new RegExp(`(?:^|; )${n}=([^;]+)`))?.[1];
  const fbp = ads ? cookie('_fbp') : undefined;
  const fbc = ads ? cookie('_fbc') || s.fbc : undefined;
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
/** What has been started so far; a later yes to more starts the rest. */
const on: Consent = { analytics: false, ads: false };
let gtagScript = false;
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

/**
 * Starts the connected services the visitor said yes to: analytics (Google
 * Analytics, analytics tools) and/or ads (Google Ads, Meta, TikTok, ad
 * tools). Called again after a yes to more, it starts only what's new.
 * Google is told the choice too (consent mode), so Tag Manager's tags follow it.
 */
export function loadTracking(c: PublicMarketing, consent: Consent) {
  cfg = c;
  if (typeof window === 'undefined') return;
  const addAnalytics = consent.analytics && !on.analytics, addAds = consent.ads && !on.ads;
  if (!addAnalytics && !addAds) return;
  const first = !loaded;
  loaded = true;
  if (addAnalytics) on.analytics = true;
  if (addAds) on.ads = true;
  const g = c.google;
  const mode = { analytics_storage: on.analytics ? 'granted' : 'denied', ad_storage: on.ads ? 'granted' : 'denied', ad_user_data: on.ads ? 'granted' : 'denied', ad_personalization: on.ads ? 'granted' : 'denied' };
  if (g.ga4 || g.ads || g.gtm) {
    if (!window.gtag) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() { window.dataLayer!.push(arguments); };
      window.gtag('consent', 'default', mode);
    } else window.gtag('consent', 'update', mode);
  }
  if (g.gtm && first) {
    window.dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    script(`https://www.googletagmanager.com/gtm.js?id=${g.gtm}`);
  }
  const ga4 = addAnalytics && g.ga4, gads = addAds && g.ads;
  if ((ga4 || gads) && !gtagScript) {
    gtagScript = true;
    script(`https://www.googletagmanager.com/gtag/js?id=${ga4 || gads}`);
    window.gtag!('js', new Date());
  }
  if (ga4) window.gtag!('config', g.ga4);
  if (gads) window.gtag!('config', g.ads);
  if (addAds) loadAds(c);
  placeSnippets((c.snippets ?? []).filter((x) => x.consent && ((x.category ?? 'ads') === 'analytics' ? addAnalytics : addAds)));
  const early = pending; pending = [];
  for (const [e, d] of early) track(e, d);
}

/** The Meta and TikTok pixels: ads only. */
function loadAds(c: PublicMarketing) {
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
    const c = getConsent();
    if ((!c || c.analytics || c.ads) && pending.length < 20) pending.push([event, d]);
    return;
  }
  const value = Math.round(d.value * 100) / 100;
  const ids = d.items.map((i) => i.id);
  const num = d.items.reduce((n, i) => n + (i.quantity ?? 1), 0);
  try {
    window.fbq?.('track', event, { value, currency: 'GEL', content_ids: ids, content_type: 'product', contents: d.items.map((i) => ({ id: i.id, quantity: i.quantity ?? 1 })), num_items: num },
      d.orderId ? { eventID: d.orderId } : undefined);
    const gItems = d.items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity ?? 1 }));
    if (window.gtag && ((on.analytics && cfg.google.ga4) || (on.ads && cfg.google.ads))) {
      window.gtag('event', GOOGLE[event], { currency: 'GEL', value, items: gItems, ...(d.orderId ? { transaction_id: d.orderId } : {}) });
      if (event === 'Purchase' && on.ads && cfg.google.ads && cfg.google.adsLabel) {
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
