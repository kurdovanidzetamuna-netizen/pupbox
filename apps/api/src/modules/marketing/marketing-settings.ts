import type { PrismaService } from '../prisma/prisma.service';

/**
 * Admin → SEO & tracking: search-engine ownership checks, Google and Meta
 * (Facebook / Instagram) and TikTok tracking, and a few site-wide SEO
 * switches. Kept in its own private CMS row (`config-marketing`) because it
 * holds the Meta Conversions API token: the general CMS endpoints never read
 * or write it (see cms.controller.ts), the site only ever gets the public
 * part (publicMarketing), and the token always goes back masked.
 */
export const MARKETING_SLUG = 'config-marketing';

/** Where a pasted piece of code goes on every page. */
export type SnippetPlace = 'head' | 'body-start' | 'body-end';
export const SNIPPET_PLACES: SnippetPlace[] = ['head', 'body-start', 'body-end'];

/**
 * Code from any other service, pasted as the service gives it (chat
 * widgets, heatmaps, extra pixels). Needs "Add custom code to the site".
 */
export interface Snippet {
  id: string;
  /** Which tool from admin's list it was added as ("" = any other code). */
  tool: string;
  name: string;
  place: SnippetPlace;
  code: string;
  /** Load only after the visitor accepts cookies (anything that tracks). */
  consent: boolean;
  on: boolean;
}

export interface MarketingSettings {
  /** The code from each service's "verify with an HTML tag" option. */
  verification: { google: string; bing: string; meta: string; yandex: string };
  google: {
    /** Google Analytics 4 measurement ID, G-XXXXXXX. */
    ga4: string;
    /** Google Tag Manager container, GTM-XXXXXX. */
    gtm: string;
    /** Google Ads tag AW-123… and the label of its "Purchase" conversion. */
    ads: string;
    adsLabel: string;
  };
  meta: {
    /** The pixel (dataset) ID from Events Manager. */
    pixel: string;
    /** Conversions API: purchases sent from our server too. */
    capi: boolean;
    token: string;
    /** Events Manager → Test events code, while checking the setup. Empty in normal use. */
    testCode: string;
  };
  tiktok: { pixel: string };
  /** Ask visitors before any tracking loads (on by default; the law expects it). */
  consent: { banner: boolean };
  seo: {
    /** Tell search engines to stay away from every page (test periods). */
    hideFromSearch: boolean;
  };
  snippets: Snippet[];
}

export const MARKETING_DEFAULTS: MarketingSettings = {
  verification: { google: '', bing: '', meta: '', yandex: '' },
  google: { ga4: '', gtm: '', ads: '', adsLabel: '' },
  meta: { pixel: '', capi: false, token: '', testCode: '' },
  tiktok: { pixel: '' },
  consent: { banner: true },
  seo: { hideFromSearch: false },
  snippets: [],
};

/** What each ID has to look like; anything else is dropped rather than put on the site. */
const FORMATS = {
  ga4: /^G-[A-Z0-9]{4,16}$/,
  gtm: /^GTM-[A-Z0-9]{4,12}$/,
  ads: /^AW-\d{6,14}$/,
  adsLabel: /^[A-Za-z0-9_-]{4,40}$/,
  metaPixel: /^\d{8,20}$/,
  metaTest: /^TEST\d{3,10}$/,
  tiktok: /^[A-Z0-9]{10,30}$/,
  verify: /^[A-Za-z0-9_\-=.:+/]{4,120}$/,
};

/**
 * Takes either the bare code or the whole tag a service hands out
 * (<meta name="google-site-verification" content="abc…" />).
 */
export function verificationCode(v: unknown): string {
  let s = typeof v === 'string' ? v.trim() : '';
  const m = s.match(/content\s*=\s*["']([^"']+)["']/i);
  if (m) s = m[1].trim();
  return FORMATS.verify.test(s) ? s : '';
}

/**
 * Where each ID sits in the code a service hands out, so admin can paste the
 * whole snippet (or the bare ID) and we keep just the ID.
 */
const IN_CODE = {
  ga4: /\b(G-[A-Z0-9]{4,16})\b/i,
  gtm: /\b(GTM-[A-Z0-9]{4,12})\b/i,
  ads: /\b(AW-\d{6,14})\b/i,
  adsLabel: /AW-\d{6,14}\/([A-Za-z0-9_-]{4,40})/,
  metaPixel: /fbq\(\s*['"]init['"]\s*,\s*['"]?(\d{8,20})|facebook\.com\/tr\?id=(\d{8,20})/,
  tiktok: /ttq\.load\(\s*['"]([A-Z0-9]{10,30})['"]|sdkid=([A-Z0-9]{10,30})/i,
};
const fromCode = (s: string, re?: RegExp) => {
  const m = re ? s.match(re) : null;
  return m ? (m[1] ?? m[2] ?? '').trim() : s;
};

const id = (v: unknown, re: RegExp, upper = true, inCode?: RegExp) => {
  let s = typeof v === 'string' ? fromCode(v.trim(), inCode) : '';
  if (upper) s = s.toUpperCase();
  return re.test(s) ? s : '';
};

const SNIPPET_MAX = 40, CODE_MAX = 20_000;
function cleanSnippets(list: unknown): Snippet[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, SNIPPET_MAX).flatMap((x: any, i): Snippet[] => {
    const code = typeof x?.code === 'string' ? x.code.trim().slice(0, CODE_MAX) : '';
    if (!code) return [];
    return [{
      id: typeof x.id === 'string' && /^[a-z0-9]{4,24}$/.test(x.id) ? x.id : `s${Date.now().toString(36)}${i}`,
      tool: typeof x.tool === 'string' && /^[a-z0-9-]{2,30}$/.test(x.tool) ? x.tool : '',
      name: typeof x.name === 'string' && x.name.trim() ? x.name.trim().slice(0, 60) : 'Custom code',
      place: SNIPPET_PLACES.includes(x.place) ? x.place : 'head',
      code,
      consent: x.consent !== false,
      on: x.on !== false,
    }];
  });
}

/** Cleans what is stored (or sent by admin); unknown or badly formed values become empty. */
export function cleanMarketing(c: any): MarketingSettings {
  c = c ?? {};
  return {
    verification: {
      google: verificationCode(c.verification?.google),
      bing: verificationCode(c.verification?.bing),
      meta: verificationCode(c.verification?.meta),
      yandex: verificationCode(c.verification?.yandex),
    },
    google: {
      ga4: id(c.google?.ga4, FORMATS.ga4, true, IN_CODE.ga4),
      gtm: id(c.google?.gtm, FORMATS.gtm, true, IN_CODE.gtm),
      ads: id(c.google?.ads, FORMATS.ads, true, IN_CODE.ads),
      adsLabel: id(c.google?.adsLabel, FORMATS.adsLabel, false, IN_CODE.adsLabel),
    },
    meta: {
      pixel: id(c.meta?.pixel, FORMATS.metaPixel, true, IN_CODE.metaPixel),
      capi: c.meta?.capi === true,
      token: typeof c.meta?.token === 'string' ? c.meta.token.trim().slice(0, 400) : '',
      testCode: id(c.meta?.testCode, FORMATS.metaTest),
    },
    tiktok: { pixel: id(c.tiktok?.pixel, FORMATS.tiktok, true, IN_CODE.tiktok) },
    consent: { banner: c.consent?.banner !== false },
    seo: { hideFromSearch: c.seo?.hideFromSearch === true },
    snippets: cleanSnippets(c.snippets),
  };
}

/** Which values admin sent that couldn't be used, so the page can say so instead of silently emptying them. */
export function rejected(input: any, clean: MarketingSettings): string[] {
  const out: string[] = [];
  const check = (sent: unknown, kept: string, label: string) => { if (typeof sent === 'string' && sent.trim() && !kept) out.push(label); };
  check(input?.verification?.google, clean.verification.google, 'Google Search Console code');
  check(input?.verification?.bing, clean.verification.bing, 'Bing code');
  check(input?.verification?.meta, clean.verification.meta, 'Meta domain code');
  check(input?.verification?.yandex, clean.verification.yandex, 'Yandex code');
  check(input?.google?.ga4, clean.google.ga4, 'Google Analytics ID (looks like G-ABC123XYZ)');
  check(input?.google?.gtm, clean.google.gtm, 'Tag Manager ID (looks like GTM-ABC1234)');
  check(input?.google?.ads, clean.google.ads, 'Google Ads ID (looks like AW-123456789)');
  check(input?.google?.adsLabel, clean.google.adsLabel, 'Google Ads conversion label');
  check(input?.meta?.pixel, clean.meta.pixel, 'Meta pixel ID (digits only)');
  check(input?.meta?.testCode, clean.meta.testCode, 'Meta test code (looks like TEST12345)');
  check(input?.tiktok?.pixel, clean.tiktok.pixel, 'TikTok pixel ID');
  return out;
}

// Read on every page render (through the public endpoint) and every paid order.
let cache: { at: number; value: MarketingSettings } | null = null;
export function forgetMarketing() { cache = null; }

export async function marketingSettings(prisma: PrismaService): Promise<MarketingSettings> {
  if (cache && Date.now() - cache.at < 15_000) return cache.value;
  const row = await prisma.cMSPage.findUnique({ where: { slug: MARKETING_SLUG }, select: { content: true } });
  const value = cleanMarketing(row?.content ?? {});
  cache = { at: Date.now(), value };
  return value;
}

export const maskToken = (k: string) => (k ? `••••••${k.slice(-4)}` : '');

/** canCode: the admin has "Add custom code to the site"; without it the custom code stays as it was. */
export async function saveMarketing(prisma: PrismaService, input: any, canCode: boolean) {
  const current = await marketingSettings(prisma);
  if (!canCode) input = { ...input, snippets: current.snippets };
  // The token comes back masked; only a new one (or "" to remove it) replaces it.
  const sent = input?.meta?.token;
  const token = sent === undefined || sent === maskToken(current.meta.token) ? current.meta.token : String(sent);
  const value = cleanMarketing({ ...input, meta: { ...(input?.meta ?? {}), token } });
  await prisma.cMSPage.upsert({
    where: { slug: MARKETING_SLUG },
    update: { content: value as any },
    create: { key: MARKETING_SLUG, slug: MARKETING_SLUG, title: 'SEO & tracking', status: 'DRAFT', content: value as any },
  });
  forgetMarketing();
  return { value, rejected: rejected(input, value) };
}

/**
 * <meta> tags in pasted head code (ownership checks from Search Console,
 * Ahrefs, Pinterest…, Facebook's fb:app_id). The site writes these into
 * the page itself: services check the page as first sent, before any of
 * our code runs. http-equiv tags (redirects, security headers) are left out.
 */
export function metaTagsOf(snippets: Snippet[]) {
  const out: { name?: string; property?: string; content: string }[] = [];
  const seen = new Set<string>();
  const attr = (tag: string, n: string) => tag.match(new RegExp(`\\s${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))?.slice(1).find((x) => x !== undefined);
  for (const sn of snippets) {
    if (!sn.on || sn.place !== 'head') continue;
    for (const tag of sn.code.match(/<meta\b[^>]*>/gi) ?? []) {
      const name = attr(tag, 'name'), property = attr(tag, 'property'), content = attr(tag, 'content');
      const key = name ?? property;
      if (!key || content === undefined || !/^[A-Za-z0-9_:.\-]{1,80}$/.test(key) || content.length > 500) continue;
      const k = `${key}=${content}`;
      if (seen.has(k) || out.length >= 40) continue;
      seen.add(k);
      out.push({ ...(name ? { name } : { property }), content });
    }
  }
  return out;
}

/** The part the site may see: IDs that are public in any page's source anyway. Never the token. */
export function publicMarketing(s: MarketingSettings) {
  return {
    verification: s.verification,
    google: s.google,
    meta: { pixel: s.meta.pixel },
    tiktok: s.tiktok,
    consent: s.consent,
    seo: s.seo,
    snippets: s.snippets.filter((x) => x.on).map(({ id, place, code, consent }) => ({ id, place, code, consent })),
    metaTags: metaTagsOf(s.snippets),
  };
}

/** For admin: everything, with the token masked. */
export const forAdmin = (s: MarketingSettings) => ({ ...s, meta: { ...s.meta, token: maskToken(s.meta.token) } });
