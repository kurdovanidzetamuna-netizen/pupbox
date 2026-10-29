'use client';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { PAGES, cmsSlug, mergedSections } from '@pupbox/content';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge').replace(/\/$/, '');
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}` });
const err = (d: any, f: string) => (Array.isArray(d?.message) ? d.message[0] : d?.message) || f;
const can = (perm: string) => {
  try { return (JSON.parse(atob((localStorage.getItem('admin_token') || '').split('.')[1])).permissions ?? []).includes(perm); } catch { return false; }
};

type S = {
  verification: { google: string; bing: string; meta: string; yandex: string };
  google: { ga4: string; gtm: string; ads: string; adsLabel: string };
  meta: { pixel: string; capi: boolean; token: string; testCode: string };
  tiktok: { pixel: string };
  consent: { banner: boolean };
  seo: { hideFromSearch: boolean };
  snippets: Snippet[];
};
type Place = 'head' | 'body-start' | 'body-end';
type Snippet = { id: string; tool: string; name: string; place: Place; code: string; consent: boolean; on: boolean };
type Sent = { at: string; ok: boolean; event: string; message: string };
type Tab = 'connect' | 'code' | 'checks' | 'feed' | 'texts';
const TABS: { key: Tab; label: string }[] = [
  { key: 'connect', label: '📈 Ads & analytics' },
  { key: 'code', label: '🧩 Other tools & code' },
  { key: 'checks', label: '✅ Site checks' },
  { key: 'feed', label: '🛍️ Product feed' },
  { key: 'texts', label: '🔍 Google texts' },
];

// ── Reading IDs out of pasted code ──────────────────────────────────────────
// Each service hands out a block of code; the site only needs the ID inside
// it (it adds the code itself, after the cookie choice). Same rules as the
// API's marketing-settings.ts.
type Found = { ga4?: string; gtm?: string; ads?: string; adsLabel?: string; metaPixel?: string; tiktok?: string };
const IN_CODE: Record<keyof Found, RegExp> = {
  ga4: /\b(G-[A-Z0-9]{4,16})\b/i,
  gtm: /\b(GTM-[A-Z0-9]{4,12})\b/i,
  ads: /\b(AW-\d{6,14})\b/i,
  adsLabel: /AW-\d{6,14}\/([A-Za-z0-9_-]{4,40})/,
  metaPixel: /fbq\(\s*['"]init['"]\s*,\s*['"]?(\d{8,20})|facebook\.com\/tr\?id=(\d{8,20})/,
  tiktok: /ttq\.load\(\s*['"]([A-Z0-9]{10,30})['"]|sdkid=([A-Z0-9]{10,30})/i,
};
function found(text: string): Found {
  const out: Found = {};
  for (const k of Object.keys(IN_CODE) as (keyof Found)[]) {
    const m = text.match(IN_CODE[k]);
    const v = m && (m[1] ?? m[2]);
    if (v) out[k] = k === 'adsLabel' ? v : v.toUpperCase();
  }
  return out;
}
const NAMES: Record<keyof Found, string> = { ga4: 'Google Analytics ID', gtm: 'Tag Manager ID', ads: 'Google Ads ID', adsLabel: 'Google Ads purchase label', metaPixel: 'Meta pixel ID', tiktok: 'TikTok pixel ID' };
/** Puts what was found into the settings. */
function applyFound(x: S, f: Found): S {
  if (f.ga4) x.google.ga4 = f.ga4;
  if (f.gtm) x.google.gtm = f.gtm;
  if (f.ads) x.google.ads = f.ads;
  if (f.adsLabel) x.google.adsLabel = f.adsLabel;
  if (f.metaPixel) x.meta.pixel = f.metaPixel;
  if (f.tiktok) x.tiktok.pixel = f.tiktok;
  return x;
}
/** An ID box: typing keeps what's typed; pasting a whole snippet keeps just the ID. */
const idFrom = (v: string, k: keyof Found, upper = true) => found(v)[k] ?? (upper ? v.toUpperCase() : v).trim();

/**
 * Admin → SEO & tracking. Connect Google (Analytics, Tag Manager, Ads),
 * Meta (Facebook & Instagram pixel and Conversions API) and TikTok; prove
 * the site is ours to Search Console, Bing and Meta Business; hand Meta and
 * Google the product feed; and see every page's Google texts with what's
 * weak. Seeing it needs "See SEO & tracking"; changing it, "Change SEO &
 * tracking" (Roles & Permissions).
 */
export default function MarketingPage() {
  const [tab, setTab] = useState<Tab>('connect');
  const [saved, setSaved] = useState<S | null>(null);
  const [s, setS] = useState<S | null>(null);
  const [recent, setRecent] = useState<Sent[]>([]);
  const [feeds, setFeeds] = useState<{ ka: string; en: string } | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [edit, setEdit] = useState(false);
  const [denied, setDenied] = useState(false);
  const [canCode, setCanCode] = useState(false);

  useEffect(() => {
    setEdit(can('marketing.manage'));
    fetch(`${API}/admin/marketing/settings`, { headers: auth() })
      .then(async (r) => { if (r.status === 403) { setDenied(true); return null; } return r.json(); })
      .then((d) => { if (!d) return; setCanCode(!!d.canCode); setSaved(d.settings); setS(d.settings); setRecent(d.recent ?? []); setFeeds(d.feeds); })
      .catch(() => setMsg({ ok: false, text: 'Couldn’t load the settings. Check the connection and refresh.' }));
  }, []);

  const dirty = useMemo(() => !!s && !!saved && (JSON.stringify(s) !== JSON.stringify(saved) || newToken !== null), [s, saved, newToken]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  if (denied) return <div style={{ padding: 28, color: 'var(--slate-500)' }}>Your role doesn’t include SEO & tracking. Ask an administrator for access.</div>;
  if (!s) return <div style={{ padding: 28, color: 'var(--slate-400)' }}>{msg?.text ?? 'Loading…'}</div>;
  const up = (f: (x: S) => S) => { setS((x) => (x ? f(structuredClone(x)) : x)); setMsg(null); };

  async function save() {
    setSaving(true); setMsg(null);
    const body = { ...s, meta: { ...s!.meta, ...(newToken !== null ? { token: newToken.trim() } : {}) } };
    const r = await fetch(`${API}/admin/marketing/settings`, { method: 'PUT', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setMsg({ ok: false, text: err(d, `Not saved (error ${r.status}).`) }); return; }
    setSaved(d.settings); setS(d.settings); setNewToken(null); setRecent(d.recent ?? []); setCanCode(!!d.canCode);
    setMsg(d.rejected?.length
      ? { ok: false, text: `Saved, but these didn’t look right and were left empty: ${d.rejected.join(' · ')}` }
      : { ok: true, text: 'Saved — the site uses it within a minute.' });
  }

  async function metaTest() {
    setTesting(true); setMsg(null);
    const r = await fetch(`${API}/admin/marketing/meta-test`, { method: 'POST', headers: auth() });
    const d = await r.json().catch(() => ({}));
    setTesting(false);
    if (!r.ok) { setMsg({ ok: false, text: err(d, 'Test not sent.') }); return; }
    setRecent(d.recent ?? []);
    setMsg({ ok: d.result.ok, text: d.result.ok ? `Meta answered: ${d.result.message}.${s!.meta.testCode ? ' Look under Events Manager → Test events.' : ''}` : `Meta said: ${d.result.message}` });
  }

  const ro = !edit;
  const metaOn = !!(saved?.meta.pixel);
  const capiReady = !!(saved?.meta.pixel && saved.meta.token);

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 28px)', maxWidth: 880, paddingBottom: 110 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>📣 SEO & tracking</h1>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 16px' }}>Connect Google, Facebook & Instagram and TikTok, prove the site is yours, and keep Google texts in shape.</p>
      {ro && <p role="note" style={{ ...note, marginBottom: 14 }}>👀 You can look but not change anything here — your role has “See SEO & tracking” only.</p>}

      <div role="tablist" aria-label="Sections" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 4 }}>
        {TABS.map((t) => (
          <button key={t.key} role="tab" type="button" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${tab === t.key ? 'var(--teal-500)' : 'var(--slate-200)'}`, background: tab === t.key ? 'var(--teal-50)' : 'var(--white)', color: tab === t.key ? 'var(--teal-800)' : 'var(--slate-600)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'connect' && <>
        <section style={{ ...card, marginTop: 10, display: 'grid', gap: 4, background: s.consent.banner ? 'var(--teal-50)' : 'var(--amber-50)', borderColor: s.consent.banner ? 'var(--teal-200)' : 'var(--amber-200, #fde68a)' }}>
          <Row title="Ask visitors first (cookie banner)" hint={s.consent.banner
            ? 'Nothing below loads until a visitor taps “Accept all”. Recommended — Georgian and EU privacy law expect it.'
            : 'Off: every visitor is tracked straight away, without being asked. Only do this if your lawyer agrees.'}>
            <Switch on={s.consent.banner} disabled={ro} label="Cookie banner" onChange={(v) => { if (!v && !confirm('Track every visitor without asking? Privacy law usually requires asking first.')) return; up((x) => ({ ...x, consent: { banner: v } })); }} />
          </Row>
        </section>

        <Service icon="🔵" name="Meta — Facebook & Instagram" on={metaOn} hint="Counts visits and sales from your Facebook and Instagram ads, and builds audiences (people who looked at a product, added to basket, bought).">
          <Steps items={[
            <>Open <Ext href="https://business.facebook.com/events_manager2">Meta Events Manager</Ext> (in your Business Manager) → <b>Connect data</b> → <b>Web</b> → name it “Pupbox”.</>,
            <>Choose <b>Install code manually</b> and copy the whole code — paste it in the box below. (Or copy just the <b>Dataset / Pixel ID</b>.)</>,
            <>For the server connection: in the same dataset → <b>Settings</b> → <b>Conversions API</b> → <b>Generate access token</b>. Paste it below and switch it on.</>,
            <>In <b>Business settings → Brand safety → Domains</b>, add <b>pupbox.ge</b> and paste its code in <i>Site checks</i>.</>,
          ]} />
          {!ro && <PasteBox from="Meta" onFound={(f) => up((x) => applyFound(x, f))} />}
          <Field label="Pixel ID" hint="Filled in from the code above, or type it: digits only, like 1234567890123456.">
            <input value={s.meta.pixel} disabled={ro} inputMode="numeric" placeholder="1234567890123456" onChange={(e) => up((x) => { x.meta.pixel = found(e.target.value).metaPixel ?? e.target.value.replace(/\D/g, ''); return x; })} style={{ ...inp, maxWidth: 280 }} aria-label="Meta pixel ID" />
          </Field>
          <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: 12, display: 'grid', gap: 12 }}>
            <Row title="Conversions API (server)" hint="Our server also tells Meta about each paid order, so sales count even when the browser blocks the pixel (iPhones, ad blockers). Only for buyers who accepted cookies.">
              <Switch on={s.meta.capi} disabled={ro} label="Conversions API" onChange={(v) => up((x) => { x.meta.capi = v; return x; })} />
            </Row>
            <Field label="Access token" hint={s.meta.token ? 'Saved — shown only as its last 4 characters.' : 'Not added yet.'}>
              {newToken === null ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <code style={code}>{s.meta.token || 'none'}</code>
                  {!ro && <button type="button" onClick={() => setNewToken('')} style={btnSoft}>{s.meta.token ? 'Replace token' : '+ Add token'}</button>}
                  {!ro && s.meta.token && <button type="button" onClick={() => { if (confirm('Remove the token? Purchases stop going to Meta from the server.')) setNewToken(''); }} style={{ ...btnSoft, color: 'var(--red-600)' }}>Remove</button>}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input autoFocus type="password" autoComplete="off" value={newToken} onChange={(e) => { setNewToken(e.target.value); setMsg(null); }} placeholder="Paste the token from Events Manager" style={{ ...inp, flex: '1 1 240px' }} aria-label="New Meta access token" />
                  <button type="button" onClick={() => setNewToken(null)} style={btnSoft}>Keep the old one</button>
                </div>
              )}
            </Field>
            <Field label="Test code (optional)" hint="Events Manager → Test events shows a code like TEST12345. While it’s here, events show there instead of in your reports — clear it when you’re done.">
              <input value={s.meta.testCode} disabled={ro} placeholder="TEST12345" onChange={(e) => up((x) => { x.meta.testCode = e.target.value.toUpperCase().trim(); return x; })} style={{ ...inp, maxWidth: 200 }} aria-label="Meta test event code" />
            </Field>
            {!ro && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" onClick={metaTest} disabled={!capiReady || testing || dirty} title={dirty ? 'Save first' : !capiReady ? 'Add the pixel ID and token, then save' : undefined}
                  style={{ ...btnSoft, opacity: !capiReady || dirty ? 0.5 : 1 }}>{testing ? 'Sending…' : 'Send a test event'}</button>
                <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Checks the pixel ID and token together.</span>
              </div>
            )}
            {recent.length > 0 && (
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--slate-600)', margin: '4px 0 6px' }}>Latest sent to Meta (since the server last restarted)</div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
                  {recent.slice(0, 6).map((r, i) => (
                    <li key={i} style={{ fontSize: 12.5, display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--slate-600)' }}>
                      <span style={{ fontWeight: 800, color: r.ok ? 'var(--green-800)' : 'var(--red-600)' }}>{r.ok ? '✓' : '✕'}</span>
                      <span style={{ fontWeight: 700 }}>{r.event}</span>
                      <span>{r.message}</span>
                      <span style={{ color: 'var(--slate-400)' }}>{new Date(r.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Service>

        <Service icon="🟢" name="Google — Analytics, Tag Manager & Ads" on={!!(saved?.google.ga4 || saved?.google.gtm || saved?.google.ads)} hint="Visitors, where they come from, and sales from Google Ads. Fill only what you use.">
          <Steps items={[
            <><Ext href="https://analytics.google.com">Google Analytics</Ext> → Admin → <b>Data streams</b> → Web → <b>View tag instructions</b> → <b>Install manually</b>: copy the whole code and paste it in the box below. (Or copy just the <b>Measurement ID</b>, G-….)</>,
            <>Using <Ext href="https://tagmanager.google.com">Tag Manager</Ext> instead? Copy the container ID (GTM-…). Don’t add GA4 in both places, or visits count twice.</>,
            <>For Google Ads: Tools → <b>Conversions</b> → your “Purchase” conversion → Tag setup → <b>Install the tag yourself</b>: paste the <b>event snippet</b> in the box below — it holds both the ID (AW-…) and the conversion <b>label</b>.</>,
          ]} />
          {!ro && <PasteBox from="Google" onFound={(f) => up((x) => applyFound(x, f))} />}
          <div style={grid2}>
            <Field label="Analytics 4 — Measurement ID"><input value={s.google.ga4} disabled={ro} placeholder="G-ABC123XYZ" onChange={(e) => up((x) => { x.google.ga4 = idFrom(e.target.value, 'ga4'); return x; })} style={inp} aria-label="Google Analytics measurement ID" /></Field>
            <Field label="Tag Manager — Container ID"><input value={s.google.gtm} disabled={ro} placeholder="GTM-ABC1234" onChange={(e) => up((x) => { x.google.gtm = idFrom(e.target.value, 'gtm'); return x; })} style={inp} aria-label="Google Tag Manager container ID" /></Field>
            <Field label="Google Ads — ID"><input value={s.google.ads} disabled={ro} placeholder="AW-123456789" onChange={(e) => up((x) => { x.google.ads = idFrom(e.target.value, 'ads'); return x; })} style={inp} aria-label="Google Ads ID" /></Field>
            <Field label="Google Ads — Purchase label"><input value={s.google.adsLabel} disabled={ro} placeholder="AbC-D_efG-h12_34" onChange={(e) => up((x) => { x.google.adsLabel = idFrom(e.target.value, 'adsLabel', false); return x; })} style={inp} aria-label="Google Ads purchase conversion label" /></Field>
          </div>
        </Service>

        <Service icon="⚫" name="TikTok" on={!!saved?.tiktok.pixel} hint="Visits and sales from TikTok ads.">
          <Steps items={[<><Ext href="https://ads.tiktok.com/i18n/events_manager">TikTok Events Manager</Ext> → <b>Connect data source</b> → Web → Manual setup → copy the pixel code and paste it below (or just the <b>Pixel ID</b>).</>]} />
          {!ro && <PasteBox from="TikTok" onFound={(f) => up((x) => applyFound(x, f))} />}
          <Field label="Pixel ID"><input value={s.tiktok.pixel} disabled={ro} placeholder="C1ABCDEFGH23IJKLMN45" onChange={(e) => up((x) => { x.tiktok.pixel = idFrom(e.target.value, 'tiktok'); return x; })} style={{ ...inp, maxWidth: 320 }} aria-label="TikTok pixel ID" /></Field>
        </Service>

        <section style={{ ...card, marginTop: 14 }}>
          <h2 style={h2}>What gets reported</h2>
          <p style={hintP}>Sent automatically to every service connected above, in ₾ — ready for ads that optimise for sales.</p>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4, fontSize: 13, color: 'var(--slate-700)' }}>
            <li><b>Page view</b> — every page.</li>
            <li><b>View content</b> — a product page is opened.</li>
            <li><b>Add to cart</b> — a product, plan or built box goes in the basket.</li>
            <li><b>Initiate checkout</b> — checkout opens.</li>
            <li><b>Purchase</b> — payment confirmed, with the amount and the order number (from the browser, and from our server for Meta).</li>
          </ul>
          <p style={{ ...hintP, margin: '10px 0 0' }}>Each order also keeps where the buyer came from (ad click, campaign link, website) — shown on the order in Orders.</p>
        </section>
      </>}

      {tab === 'code' && <CustomCode list={s.snippets} ro={ro || !canCode} roleNote={!ro && !canCode}
        onChange={(list) => up((x) => ({ ...x, snippets: list }))}
        onMove={(id, f) => up((x) => ({ ...applyFound(x, f), snippets: x.snippets.filter((sn) => sn.id !== id) }))} />}

      {tab === 'checks' && <>
        <Section title="Prove the site is yours" hint="Each service gives you a code (“HTML tag” option). Paste the code, or the whole <meta …> tag — we take the code out of it. Save, wait a minute, then press Verify in that service.">
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Google Search Console" hint={<>Add property → URL prefix <b>{SITE}</b> → HTML tag. (A Domain property is verified through your domain’s DNS instead.)</>}>
              <input value={s.verification.google} disabled={ro} placeholder="abc123…" onChange={(e) => up((x) => { x.verification.google = e.target.value; return x; })} style={inp} aria-label="Google Search Console code" />
            </Field>
            <Field label="Meta Business — domain" hint="Business settings → Brand safety → Domains → pupbox.ge → Meta-tag verification.">
              <input value={s.verification.meta} disabled={ro} placeholder="a1b2c3d4e5…" onChange={(e) => up((x) => { x.verification.meta = e.target.value; return x; })} style={inp} aria-label="Meta domain verification code" />
            </Field>
            <Field label="Bing Webmaster Tools" hint="Or skip it: Bing can import the site straight from Google Search Console.">
              <input value={s.verification.bing} disabled={ro} placeholder="ABCDEF0123…" onChange={(e) => up((x) => { x.verification.bing = e.target.value; return x; })} style={inp} aria-label="Bing verification code" />
            </Field>
            <Field label="Yandex Webmaster">
              <input value={s.verification.yandex} disabled={ro} placeholder="0123abcd…" onChange={(e) => up((x) => { x.verification.yandex = e.target.value; return x; })} style={inp} aria-label="Yandex verification code" />
            </Field>
          </div>
        </Section>
        <Section title="Sitemap" hint="After verifying, give Google and Bing this address (Search Console → Sitemaps) so they find every page.">
          <Copy text={`${SITE}/sitemap.xml`} />
        </Section>
        <section style={{ ...card, marginTop: 14, background: s.seo.hideFromSearch ? 'var(--red-50)' : 'var(--white)', borderColor: s.seo.hideFromSearch ? 'var(--red-200, #fecaca)' : 'var(--slate-200b)' }}>
          <Row title="Hide the whole site from Google" hint={s.seo.hideFromSearch ? 'ON — search engines are told not to show any page. Turn it off for launch.' : 'Off — pages can appear in Google. Turn on only for a closed test period.'}>
            <Switch on={s.seo.hideFromSearch} disabled={ro} label="Hide the site from search engines" onChange={(v) => { if (v && !confirm('Hide every page from Google? The site can drop out of search results until you turn this off.')) return; up((x) => ({ ...x, seo: { hideFromSearch: v } })); }} />
          </Row>
        </section>
      </>}

      {tab === 'feed' && feeds && <>
        <Section title="Product feed" hint="One address with every product in the shop — name, picture, price, stock — updated by itself. Meta and Google read it daily, so ads always show the right price and hide sold-out products.">
          <div style={{ display: 'grid', gap: 10 }}>
            <Field label="Georgian"><Copy text={feeds.ka} /></Field>
            <Field label="English"><Copy text={feeds.en} /></Field>
            <p style={{ ...note, margin: 0 }}>Only products with a photo are included. Meta and Google need JPG or PNG photos at least 500×500 — other picture types are skipped by them.</p>
          </div>
        </Section>
        <Section title="Facebook & Instagram shop and catalogue ads" hint="Shows your products on Instagram and Facebook, and lets ads show each person the products they looked at.">
          <Steps items={[
            <>Open <Ext href="https://business.facebook.com/commerce">Commerce Manager</Ext> → <b>Add catalogue</b> → E-commerce → <b>Upload product info</b>.</>,
            <>Choose <b>Data feed</b> → <b>Scheduled feed</b>, paste the Georgian address above, repeat <b>daily</b>, currency GEL.</>,
            <>In the catalogue → <b>Events data sources</b>, connect your Pupbox pixel. Purchases and views then match products by their IDs.</>,
          ]} />
        </Section>
        <Section title="Google Shopping" hint="Free product listings on Google, and Shopping ads.">
          <Steps items={[
            <>Open <Ext href="https://merchants.google.com">Google Merchant Center</Ext> → Products → <b>Add products</b> → <b>Add products from a file</b>.</>,
            <>Enter a link to a file: paste the Georgian address above, country Georgia, language Georgian, fetch <b>daily</b>.</>,
          ]} />
        </Section>
      </>}

      {tab === 'texts' && <GoogleTexts />}

      {/* Save bar: settings tabs only, and only for people who may change them */}
      {edit && tab !== 'texts' && tab !== 'feed' && (
        <div style={{ position: 'sticky', bottom: 12, zIndex: 5, marginTop: 16, padding: 12, borderRadius: 16, background: 'var(--white)', border: '1px solid var(--slate-200b)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span role="status" style={{ flex: '1 1 180px', fontSize: 13, fontWeight: 600, color: msg ? (msg.ok ? 'var(--teal-700)' : 'var(--red-600)') : dirty ? 'var(--amber-700)' : 'var(--slate-400)' }}>
            {msg?.text ?? (dirty ? 'Unsaved changes' : 'All saved')}
          </span>
          {dirty && <button type="button" onClick={() => { if (confirm('Discard your changes?')) { setS(saved); setNewToken(null); setMsg(null); } }} style={btnSoft}>Discard</button>}
          <button type="button" onClick={save} disabled={!dirty || saving} style={{ padding: '10px 18px', borderRadius: 11, border: 'none', background: 'var(--teal-600)', color: 'var(--white)', fontSize: 13.5, fontWeight: 800, cursor: dirty ? 'pointer' : 'default', opacity: dirty && !saving ? 1 : 0.5 }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      )}
      {!edit && msg && <p role="status" style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: msg.ok ? 'var(--teal-700)' : 'var(--red-600)' }}>{msg.text}</p>}
    </div>
  );
}

// ── Pasting a service's code ────────────────────────────────────────────────
/** A box for the whole block of code a service gives you; the IDs in it fill the boxes below. */
function PasteBox({ from, onFound }: { from: string; onFound: (f: Found) => void }) {
  const [text, setText] = useState('');
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  const take = (v: string) => {
    setText(v);
    if (!v.trim()) { setSaid(null); return; }
    const f = found(v);
    const keys = Object.keys(f) as (keyof Found)[];
    if (!keys.length) { setSaid({ ok: false, text: `No ${from} ID found in this. Copy the whole code again, or type the ID in the box below.` }); return; }
    onFound(f);
    setText('');
    setSaid({ ok: true, text: `✓ Found ${keys.map((k) => `${NAMES[k]} ${f[k]}`).join(' · ')} — filled in. Press Save.` });
  };
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-700)' }}>Paste the code from {from}</div>
      <div style={{ fontSize: 12, color: 'var(--slate-500)', margin: '1px 0 6px', lineHeight: 1.45 }}>The whole &lt;script&gt;…&lt;/script&gt; block is fine. You don’t add it to the site’s code — the site puts it on every page itself, after the visitor’s cookie choice.</div>
      <textarea value={text} onChange={(e) => take(e.target.value)} rows={3} spellCheck={false} placeholder={`<!-- ${from} code -->\n<script>…</script>`}
        style={{ ...inp, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, resize: 'vertical' }} aria-label={`Paste the code from ${from}`} />
      {said && <div role="status" style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: said.ok ? 'var(--teal-700)' : 'var(--red-600)' }}>{said.text}</div>}
    </div>
  );
}

// ── Custom code ─────────────────────────────────────────────────────────────
const PLACES: { key: Place; label: string; hint: string }[] = [
  { key: 'head', label: 'In <head>', hint: 'Where most services ask for it.' },
  { key: 'body-start', label: 'Start of <body>', hint: 'For “paste right after the opening <body> tag” (the <noscript> parts).' },
  { key: 'body-end', label: 'End of <body>', hint: 'Chat widgets and anything that should load last.' },
];

type Group = 'chat' | 'analytics' | 'google' | 'meta' | 'ads' | 'seo' | 'other';
const GROUPS: { key: Group; label: string }[] = [
  { key: 'chat', label: '💬 Live chat & AI assistants' },
  { key: 'analytics', label: '📊 Analytics & heatmaps' },
  { key: 'google', label: '🟢 Other Google products' },
  { key: 'meta', label: '🔵 Meta for Developers' },
  { key: 'ads', label: '🎯 Other ad pixels' },
  { key: 'seo', label: '🔎 SEO tools & site checks' },
  { key: 'other', label: '🧩 Anything else' },
];
/**
 * Tools admin can pick from. Each sets where its code goes and whether it
 * waits for the cookie choice, and says where to copy the code. Ones with
 * `meta` only need a code: the page builds the <meta> tag itself.
 */
type Tool = { key: string; name: string; group: Group; place: Place; consent: boolean; where: string; link?: string; meta?: { name?: string; property?: string; label: string; placeholder: string } };
const verify = (key: string, name: string, metaName: string, where: string, link?: string): Tool =>
  ({ key, name, group: 'seo', place: 'head', consent: false, where, link, meta: { name: metaName, label: 'Verification code', placeholder: 'abc123… or the whole <meta …> tag' } });
const TOOLS: Tool[] = [
  { key: 'tawk', name: 'Tawk.to', group: 'chat', place: 'body-end', consent: false, link: 'https://dashboard.tawk.to', where: 'Administration → Channels → Chat Widget → copy the Widget Code.' },
  { key: 'tidio', name: 'Tidio', group: 'chat', place: 'body-end', consent: false, link: 'https://www.tidio.com/panel', where: 'Settings → Installation → JavaScript → copy the code.' },
  { key: 'crisp', name: 'Crisp', group: 'chat', place: 'body-end', consent: false, link: 'https://app.crisp.chat', where: 'Settings → Workspace settings → Setup & integrations → HTML → copy the code.' },
  { key: 'jivo', name: 'JivoChat', group: 'chat', place: 'body-end', consent: false, link: 'https://app.jivosite.com', where: 'Settings → Channels → Website → Installation → copy the code.' },
  { key: 'livechat', name: 'LiveChat', group: 'chat', place: 'body-end', consent: false, link: 'https://my.livechatinc.com', where: 'Settings → Channels → Website → Install manually → copy the code.' },
  { key: 'intercom', name: 'Intercom', group: 'chat', place: 'body-end', consent: false, link: 'https://app.intercom.com', where: 'Settings → Installation → Web → Install with code snippet → copy the code.' },
  { key: 'ai-chat', name: 'AI chat assistant (Chatbase, Botpress…)', group: 'chat', place: 'body-end', consent: false, where: 'In the tool, open your bot → Embed / Deploy / Connect → Website → copy the script code.' },
  { key: 'clarity', name: 'Microsoft Clarity', group: 'analytics', place: 'head', consent: true, link: 'https://clarity.microsoft.com', where: 'Your project → Settings → Setup → Install manually → copy the tracking code.' },
  { key: 'hotjar', name: 'Hotjar', group: 'analytics', place: 'head', consent: true, link: 'https://insights.hotjar.com', where: 'Settings → Sites & Organizations → Tracking code → copy the code.' },
  { key: 'yandex-metrica', name: 'Yandex Metrica', group: 'analytics', place: 'head', consent: true, link: 'https://metrika.yandex.com', where: 'Your tag → Settings → copy the tag code at the bottom.' },
  { key: 'plausible', name: 'Plausible', group: 'analytics', place: 'head', consent: false, link: 'https://plausible.io/sites', where: 'Site settings → General → Site installation → copy the script. It uses no cookies, so it doesn’t need to wait for consent.' },
  { key: 'matomo', name: 'Matomo', group: 'analytics', place: 'head', consent: true, where: 'Administration → Websites → Tracking code → copy the JavaScript code.' },
  { key: 'google-tag', name: 'Another Google tag (remarketing, Floodlight, a 2nd Analytics…)', group: 'google', place: 'head', consent: true, link: 'https://ads.google.com', where: 'In the Google product: Tag setup → Install manually → copy the code. The main Analytics, Tag Manager and Ads purchase tag go in Ads & analytics.' },
  { key: 'adsense', name: 'Google AdSense', group: 'google', place: 'head', consent: true, link: 'https://adsense.google.com', where: 'Sites → your site → copy the AdSense code.' },
  verify('google-verify', 'Google Search Console / Merchant Center (extra tag)', 'google-site-verification', 'Choose the “HTML tag” way of verifying, then paste the tag or just its code.', 'https://search.google.com/search-console'),
  { key: 'fb-app', name: 'Facebook App ID', group: 'meta', place: 'head', consent: false, link: 'https://developers.facebook.com/apps', where: 'Your app → App settings → Basic → copy the App ID. Links pupbox.ge to your app, for the Sharing Debugger and sharing insights.', meta: { property: 'fb:app_id', label: 'App ID', placeholder: '123456789012345' } },
  { key: 'meta-other', name: 'Other Meta code (2nd pixel, Meta SDK…)', group: 'meta', place: 'head', consent: true, link: 'https://developers.facebook.com', where: 'Paste the code Meta for Developers or Events Manager gives you. Your main pixel goes in Ads & analytics.' },
  { key: 'linkedin', name: 'LinkedIn Insight Tag', group: 'ads', place: 'body-end', consent: true, link: 'https://www.linkedin.com/campaignmanager', where: 'Campaign Manager → Analyze → Insight Tag → Install my tag → I will install the tag myself → copy the code.' },
  { key: 'pinterest', name: 'Pinterest Tag', group: 'ads', place: 'head', consent: true, link: 'https://ads.pinterest.com', where: 'Ads → Conversions → Install the Pinterest tag → Install code manually → copy the base code.' },
  { key: 'x-pixel', name: 'X (Twitter) pixel', group: 'ads', place: 'head', consent: true, link: 'https://ads.x.com', where: 'Tools → Events manager → Add event source → Install with pixel code → copy the base code.' },
  { key: 'snapchat', name: 'Snapchat Pixel', group: 'ads', place: 'head', consent: true, link: 'https://ads.snapchat.com', where: 'Events Manager → your pixel → Setup → Install the code manually → copy the code.' },
  { key: 'microsoft-ads', name: 'Microsoft Ads (Bing) UET tag', group: 'ads', place: 'head', consent: true, link: 'https://ads.microsoft.com', where: 'Tools → UET tag → your tag → View tag → copy the code.' },
  verify('ahrefs', 'Ahrefs Webmaster Tools', 'ahrefs-site-verification', 'Add the site → HTML tag → copy the code.', 'https://app.ahrefs.com'),
  verify('pinterest-verify', 'Pinterest — claim the website', 'p:domain_verify', 'Settings → Claimed accounts → Claim website → Add HTML tag → copy the code.', 'https://www.pinterest.com/settings/claim'),
  verify('baidu', 'Baidu', 'baidu-site-verification', 'Add the site → HTML tag verification → copy the code.', 'https://ziyuan.baidu.com'),
  { key: 'any-verify', name: 'Any other verification tag', group: 'seo', place: 'head', consent: false, where: 'Paste the <meta …> tag the service gives you. It goes into the page itself, where their check looks.' },
  { key: 'other', name: 'Any other tool', group: 'other', place: 'head', consent: true, where: 'Paste the code the tool gives you, then choose where it goes and whether it waits for cookie consent.' },
];
const toolOf = (key: string) => TOOLS.find((t) => t.key === key);
const metaTag = (m: NonNullable<Tool['meta']>, v: string) => (v ? `<meta ${m.name ? `name="${m.name}"` : `property="${m.property}"`} content="${v.replace(/"/g, '')}" />` : '');
const contentOf = (codeText: string) => codeText.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? '';
const newId = () => `s${Math.random().toString(36).slice(2, 10)}`;

/**
 * Any other service — live chat, AI assistants, heatmaps, other Google and
 * Meta products, other ad pixels, SEO tools' ownership checks — added to
 * every page without touching the site's code.
 */
function CustomCode({ list, ro, roleNote, onChange, onMove }: { list: Snippet[]; ro: boolean; roleNote: boolean; onChange: (l: Snippet[]) => void; onMove: (id: string, f: Found) => void }) {
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const set = (id: string, patch: Partial<Snippet>) => onChange(list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const add = (t: Tool) => {
    const id = newId();
    onChange([...list, { id, tool: t.key, name: t.key === 'other' ? '' : t.name, place: t.place, code: '', consent: t.consent, on: true }]);
    setPicking(false); setQ(''); setFresh(id);
  };
  useEffect(() => { if (fresh) document.getElementById(`sn-${fresh}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [fresh]);
  const shown = TOOLS.filter((t) => !q.trim() || `${t.name} ${t.where}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <Section title="Other tools" hint="Live chat, AI assistants, heatmaps, other Google and Meta products, other ad pixels, SEO tools — pick one, paste its code, Save. It goes on every page by itself; nothing needs adding to the site’s code. Meta, Google Analytics and TikTok go in Ads & analytics, so sales are counted with their amounts.">
        {roleNote && <p role="note" style={{ ...note, margin: '0 0 12px' }}>🔒 Changing these needs “Add custom code to the site” in Roles & Permissions.</p>}
        {list.length === 0 && !picking && <p style={{ ...note, margin: 0 }}>Nothing added yet.</p>}
        <div style={{ display: 'grid', gap: 12 }}>
          {list.map((sn) => {
            const t = toolOf(sn.tool);
            const f = found(sn.code);
            const known = (Object.keys(f) as (keyof Found)[]).filter((k) => k !== 'adsLabel');
            return (
              <div key={sn.id} id={`sn-${sn.id}`} style={{ border: `1px solid ${fresh === sn.id ? 'var(--teal-300, #5eead4)' : 'var(--slate-200b)'}`, borderRadius: 14, padding: 14, display: 'grid', gap: 12, background: sn.on ? 'var(--white)' : 'var(--slate-50)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input value={sn.name} disabled={ro} placeholder="Name, e.g. Hotjar" maxLength={60} onChange={(e) => set(sn.id, { name: e.target.value })} style={{ ...inp, flex: 1, fontWeight: 700 }} aria-label="Name" />
                  <Switch on={sn.on} disabled={ro} label={sn.on ? 'On — on the site' : 'Off — not on the site'} onChange={(v) => set(sn.id, { on: v })} />
                </div>
                {t && (
                  <div style={{ fontSize: 12.5, color: 'var(--slate-600)', lineHeight: 1.5 }}>
                    <b>Where to find it:</b> {t.where}{t.link && <> <Ext href={t.link}>Open</Ext></>}
                  </div>
                )}
                {t?.meta ? (
                  <Field label={t.meta.label}>
                    <input value={contentOf(sn.code)} disabled={ro} autoFocus={fresh === sn.id} placeholder={t.meta.placeholder} spellCheck={false}
                      onChange={(e) => { const v = e.target.value.includes('<') ? contentOf(e.target.value) : e.target.value.trim(); set(sn.id, { code: metaTag(t.meta!, v) }); }}
                      style={{ ...inp, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }} aria-label={`${sn.name} ${t.meta.label}`} />
                  </Field>
                ) : (
                  <textarea value={sn.code} disabled={ro} autoFocus={fresh === sn.id} rows={6} spellCheck={false} onChange={(e) => set(sn.id, { code: e.target.value })} placeholder={'Paste the code here\n<script>…</script>'}
                    style={{ ...inp, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, resize: 'vertical', whiteSpace: 'pre', overflowX: 'auto' }} aria-label={`Code for ${sn.name || 'this tool'}`} />
                )}
                {known.length > 0 && (
                  <div role="note" style={{ ...note, background: 'var(--amber-50)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ flex: '1 1 220px' }}>This looks like the <b>{known.map((k) => NAMES[k]).join(', ')}</b> code. Put it in Ads & analytics instead — then add to cart and purchases are reported too, and it isn’t counted twice.</span>
                    {!ro && <button type="button" onClick={() => onMove(sn.id, f)} style={btnSoft}>Move it there</button>}
                  </div>
                )}
                {!t?.meta && <>
                  <div role="radiogroup" aria-label="Where on the page" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {PLACES.map((p) => (
                      <button key={p.key} type="button" role="radio" aria-checked={sn.place === p.key} disabled={ro} title={p.hint} onClick={() => set(sn.id, { place: p.key })}
                        style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: ro ? 'default' : 'pointer', border: `1.5px solid ${sn.place === p.key ? 'var(--teal-500)' : 'var(--slate-200)'}`, background: sn.place === p.key ? 'var(--teal-50)' : 'var(--white)', color: sn.place === p.key ? 'var(--teal-800)' : 'var(--slate-600)' }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: -6 }}>{PLACES.find((p) => p.key === sn.place)!.hint}{sn.place === 'head' && /<meta\b/i.test(sn.code) ? ' Its <meta> tags go into the page itself, so ownership checks find them.' : ''}</div>
                  <Row title="Wait for cookie consent" hint={sn.consent ? 'Loads only after the visitor taps “Accept all”. Keep this on for anything that tracks visitors.' : 'Loads for every visitor straight away. Only for code that doesn’t track anyone (a chat widget, say).'}>
                    <Switch on={sn.consent} disabled={ro} label="Wait for cookie consent" onChange={(v) => set(sn.id, { consent: v })} />
                  </Row>
                </>}
                {!ro && (
                  <div>
                    <button type="button" onClick={() => { if (!sn.code.trim() || confirm(`Remove “${sn.name || 'this'}” from the site?`)) onChange(list.filter((x) => x.id !== sn.id)); }} style={{ ...btnSoft, color: 'var(--red-600)' }}>Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!ro && list.length < 40 && !picking && <button type="button" onClick={() => setPicking(true)} style={{ ...btnSoft, marginTop: 12, borderColor: 'var(--teal-500)', color: 'var(--teal-800)', background: 'var(--teal-50)' }}>+ Add a tool</button>}
        {!ro && picking && (
          <div style={{ marginTop: 12, border: '1.5px solid var(--teal-200)', borderRadius: 14, padding: 14, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: chat, Hotjar, Pinterest…" style={{ ...inp, flex: 1 }} aria-label="Search tools" />
              <button type="button" onClick={() => { setPicking(false); setQ(''); }} style={btnSoft}>Cancel</button>
            </div>
            {GROUPS.map((g) => {
              const items = shown.filter((t) => t.group === g.key);
              if (!items.length) return null;
              return (
                <div key={g.key}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--slate-600)', marginBottom: 6 }}>{g.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 6 }}>
                    {items.map((t) => (
                      <button key={t.key} type="button" onClick={() => add(t)}
                        style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 11, border: '1.5px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-800)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!shown.length && <p style={{ ...note, margin: 0 }}>Not on the list? Choose <button type="button" onClick={() => add(toolOf('other')!)} style={{ ...btnSoft, padding: '4px 10px' }}>Any other tool</button> and paste its code.</p>}
          </div>
        )}
      </Section>
      <p style={{ ...note, marginTop: 14 }}>⚠️ Code here runs on every page, for every visitor. Paste only code from services you trust, straight from their own site. If the site misbehaves after saving, switch it off and save.</p>
    </>
  );
}

// ── Google texts overview ──────────────────────────────────────────────────
type Tx = { en: string; ka: string };
type Entry = { kind: 'Page' | 'Product' | 'Category' | 'Blog post'; name: string; path: string; title: Tx; description: Tx; own: boolean; ownDesc?: boolean; editHref: string };
const TITLE_MAX = 60, DESC_MIN = 70, DESC_MAX = 160;

function problems(e: Entry, dupes: Set<string>): string[] {
  const out: string[] = [];
  const t = (e.title.ka || e.title.en).trim(), d = (e.description.ka || e.description.en).trim();
  if (t.length + (e.kind === 'Page' && e.path === '/' ? 0 : 9) > TITLE_MAX) out.push(`Title too long (${t.length})`);
  if (!d) out.push('No description');
  // A product without its own Google text gets its price and delivery added on the site (shop/[slug]).
  else if (d.length < DESC_MIN && !(e.kind === 'Product' && !e.ownDesc)) out.push(`Description short (${d.length})`);
  else if (d.length > DESC_MAX) out.push(`Description long (${d.length})`);
  if (!e.title.ka.trim() || (d && !e.description.ka.trim())) out.push('Georgian missing');
  if (t && dupes.has(t.toLowerCase())) out.push('Same title as another page');
  return out;
}

/** Every page's Google title and description, worst first, with a link to fix each. */
function GoogleTexts() {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [only, setOnly] = useState(true);
  const [kind, setKind] = useState<string>('');

  useEffect(() => {
    const get = (u: string) => fetch(`${API}${u}`, { headers: auth() }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    (async () => {
      const pages = PAGES.filter((p) => p.sections.some((x) => x.id === 'seo'));
      const [list, ...stored] = await Promise.all([get('/admin/marketing/seo'), ...pages.map((p) => get(`/cms/admin/${cmsSlug(p)}`))]);
      const out: Entry[] = [];
      const gaps: string[] = [];
      if (stored.every((x) => x === null)) gaps.push('pages (needs “See site content”)');
      pages.forEach((p, i) => {
        if (stored[i] === null) return;
        const seo = mergedSections(p, stored[i]?.content ?? null).seo as any;
        out.push({ kind: 'Page', name: p.label, path: p.path ?? '/', title: { en: seo?.title?.en ?? '', ka: seo?.title?.ka ?? '' }, description: { en: seo?.description?.en ?? '', ka: seo?.description?.ka ?? '' }, own: true, editHref: `/dashboard/page-builder/${p.key}` });
      });
      const add = (k: Entry['kind'], items: any[] | undefined, href: (x: any) => string) => (items ?? []).forEach((x) => {
        const own = !!(x.title.ka || x.title.en);
        out.push({
          kind: k, name: x.name, path: x.path, own, ownDesc: !!(x.description.ka || x.description.en), editHref: href(x),
          title: own ? x.title : x.fallbackTitle,
          description: x.description.ka || x.description.en ? x.description : x.fallbackDescription,
        });
      });
      add('Product', list?.products, (x) => `/dashboard/products/${x.slug}/edit`);
      add('Category', list?.categories, () => '/dashboard/categories');
      add('Blog post', list?.posts, () => '/dashboard/blog');
      setMissing(gaps);
      setRows(out);
    })();
  }, []);

  const dupes = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of rows ?? []) { const t = (r.title.ka || r.title.en).trim().toLowerCase(); if (t) seen.set(t, (seen.get(t) ?? 0) + 1); }
    return new Set([...seen].filter(([, n]) => n > 1).map(([t]) => t));
  }, [rows]);

  if (!rows) return <p style={{ color: 'var(--slate-400)', marginTop: 16 }}>Loading every page…</p>;
  const scored = rows.map((r) => ({ r, p: problems(r, dupes) })).sort((a, b) => b.p.length - a.p.length);
  const shown = scored.filter((x) => (!only || x.p.length) && (!kind || x.r.kind === kind));
  const weak = scored.filter((x) => x.p.length).length;

  return (
    <section style={{ ...card, marginTop: 10 }}>
      <h2 style={h2}>Google texts</h2>
      <p style={hintP}>What Google shows for each page: a title up to ~60 characters (“ | Pupbox” is added) and a description of 70–160. Georgian is what Google reads first.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: weak ? 'var(--amber-700)' : 'var(--green-800)' }}>{weak ? `${weak} of ${rows.length} could be better` : `All ${rows.length} look good`}</span>
        <span style={{ flex: 1 }} />
        <label style={{ ...lbl }}><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Only ones to fix</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Show" style={{ ...inp, padding: '6px 10px' }}>
          <option value="">Everything</option>
          {['Page', 'Product', 'Category', 'Blog post'].map((k) => <option key={k} value={k}>{k}s</option>)}
        </select>
      </div>
      {missing.length > 0 && <p style={{ ...note, marginBottom: 10 }}>Not shown: {missing.join(', ')}.</p>}
      {shown.length === 0 && <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Nothing to fix here. 🎉</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {shown.map(({ r, p }, i) => (
          <li key={i} style={{ border: '1px solid var(--slate-200b)', borderRadius: 14, padding: 12, display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--slate-500)' }}>{r.kind}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-800)' }}>{r.name}</span>
              <span style={{ flex: 1 }} />
              <Link href={r.editHref} style={{ ...btnSoft, textDecoration: 'none', padding: '6px 11px', fontSize: 12.5 }}>Edit</Link>
            </div>
            {/* Google-style preview */}
            <div style={{ background: 'var(--slate-50)', borderRadius: 10, padding: '8px 10px', minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--slate-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>pupbox.ge › ka{r.path === '/' ? '' : r.path}</div>
              <div style={{ fontSize: 15, color: '#1a0dab', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(r.title.ka || r.title.en) + (r.path === '/' && r.kind === 'Page' ? '' : ' | Pupbox')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--slate-600)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description.ka || r.description.en || <i style={{ color: 'var(--slate-400)' }}>Google picks some text from the page</i>}</div>
            </div>
            {p.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {p.map((x) => <span key={x} style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'var(--amber-50)', color: 'var(--amber-700)' }}>{x}</span>)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Small parts ────────────────────────────────────────────────────────────
function Service({ icon, name, on, hint, children }: { icon: string; name: string; on: boolean; hint: string; children: ReactNode }) {
  return (
    <section style={{ ...card, marginTop: 14, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ ...h2, flex: '1 1 auto' }}><span aria-hidden="true">{icon}</span> {name}</h2>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: on ? 'var(--green-50)' : 'var(--slate-100)', color: on ? 'var(--green-800)' : 'var(--slate-500)' }}>{on ? '✓ Connected' : 'Not connected'}</span>
      </div>
      <p style={{ ...hintP, margin: '-6px 0 0' }}>{hint}</p>
      {children}
    </section>
  );
}
function Steps({ items }: { items: ReactNode[] }) {
  return (
    <details style={{ background: 'var(--slate-50)', borderRadius: 12, padding: '10px 12px' }}>
      <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--teal-700)' }}>Where do I find this?</summary>
      <ol style={{ margin: '8px 0 0', paddingLeft: 20, display: 'grid', gap: 6, fontSize: 13, color: 'var(--slate-700)', lineHeight: 1.5 }}>
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ol>
    </details>
  );
}
function Ext({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal-700)', fontWeight: 700 }}>{children} ↗</a>;
}
function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
      <code style={{ ...code, flex: '1 1 260px', minWidth: 0, overflowWrap: 'anywhere' }}>{text}</code>
      <button type="button" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {}); }} style={btnSoft}>{done ? 'Copied ✓' : 'Copy'}</button>
    </div>
  );
}
function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section style={{ ...card, marginTop: 14 }}>
      <h2 style={h2}>{title}</h2>
      <p style={hintP}>{hint}</p>
      {children}
    </section>
  );
}
function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 12, padding: '6px 0' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-800)' }}>{title}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 1, lineHeight: 1.45 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}
function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-700)' }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--slate-500)', margin: '1px 0 6px', lineHeight: 1.45 }}>{hint}</div>}
      <div style={{ marginTop: hint ? 0 : 6 }}>{children}</div>
    </div>
  );
}
function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      style={{ flexShrink: 0, width: 46, height: 26, borderRadius: 99, border: 'none', padding: 3, cursor: disabled ? 'default' : 'pointer', background: on ? 'var(--teal-600)' : 'var(--slate-300)', opacity: disabled ? 0.55 : 1, transition: 'background .15s', display: 'inline-flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
      <span style={{ width: 20, height: 20, borderRadius: 99, background: '#fff' }} />
    </button>
  );
}

const card: CSSProperties = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 18, padding: 18 };
const inp: CSSProperties = { width: '100%', border: '1.5px solid var(--slate-200)', borderRadius: 10, padding: '8px 11px', fontSize: 14, background: 'var(--white)', color: 'var(--slate-900)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', minWidth: 0 };
const lbl: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', cursor: 'pointer' };
const btnSoft: CSSProperties = { padding: '8px 13px', borderRadius: 10, border: '1.5px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-700)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
const code: CSSProperties = { fontSize: 13, padding: '8px 12px', borderRadius: 10, background: 'var(--slate-100)', color: 'var(--slate-700)' };
const note: CSSProperties = { fontSize: 12.5, color: 'var(--slate-600)', background: 'var(--slate-50)', borderRadius: 10, padding: '8px 12px', lineHeight: 1.5 };
const h2: CSSProperties = { margin: 0, fontSize: 15.5, fontWeight: 800, color: 'var(--slate-900)' };
const hintP: CSSProperties = { margin: '3px 0 14px', fontSize: 12.5, color: 'var(--slate-500)', lineHeight: 1.5 };
const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 };
