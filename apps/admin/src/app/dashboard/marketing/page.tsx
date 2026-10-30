'use client';
import { useEffect, useMemo, useState } from 'react';
import { ApiError, api, can, post, put } from '@/lib/api';
import { Copy, Ext, Field, Row, S, SITE, Section, Sent, Service, Steps, Switch, Tab, applyFound, btnSoft, card, code, found, grid2, h2, hintP, idFrom, inp, note } from './_parts/shared';
import { PasteBox } from './_parts/PasteBox';
import { CustomCode } from './_parts/CustomCode';
import { Cookies } from './_parts/Cookies';
import { GoogleTexts } from './_parts/GoogleTexts';

const TABS: { key: Tab; label: string }[] = [
  { key: 'connect', label: '📈 Ads & analytics' },
  { key: 'code', label: '🧩 Other tools & code' },
  { key: 'cookies', label: '🍪 Cookies' },
  { key: 'checks', label: '✅ Site checks' },
  { key: 'feed', label: '🛍️ Product feed' },
  { key: 'texts', label: '🔍 Google texts' },
];

// ── Reading IDs out of pasted code ──────────────────────────────────────────
// Each service hands out a block of code; the site only needs the ID inside
// it (it adds the code itself, after the cookie choice). Same rules as the
// API's marketing-settings.ts.

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
    api('/admin/marketing/settings')
      .then((d) => { setCanCode(!!d.canCode); setSaved(d.settings); setS(d.settings); setRecent(d.recent ?? []); setFeeds(d.feeds); })
      .catch((e) => (e instanceof ApiError && e.status === 403 ? setDenied(true) : setMsg({ ok: false, text: 'Couldn’t load the settings. Check the connection and refresh.' })));
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
    let d;
    try { d = await put('/admin/marketing/settings', body); } catch (e: any) { setMsg({ ok: false, text: e.message }); return; } finally { setSaving(false); }
    setSaved(d.settings); setS(d.settings); setNewToken(null); setRecent(d.recent ?? []); setCanCode(!!d.canCode);
    setMsg(d.rejected?.length
      ? { ok: false, text: `Saved, but these didn’t look right and were left empty: ${d.rejected.join(' · ')}` }
      : { ok: true, text: 'Saved — the site uses it within a minute.' });
  }

  async function metaTest() {
    setTesting(true); setMsg(null);
    let d;
    try { d = await post('/admin/marketing/meta-test', undefined, 'Test not sent.'); } catch (e: any) { setMsg({ ok: false, text: e.message }); return; } finally { setTesting(false); }
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
        <p role="note" style={{ ...note, marginTop: 10, background: s.consent.banner ? 'var(--teal-50)' : 'var(--amber-50)' }}>
          🍪 {s.consent.banner ? <>Analytics loads only after a visitor says yes to <b>Analytics</b>; Meta, Google Ads and TikTok only after a yes to <b>Ads</b>.</> : <>The cookie banner is <b>off</b>: everything below loads for every visitor.</>}{' '}
          <button type="button" onClick={() => setTab('cookies')} style={{ ...btnSoft, padding: '3px 9px', fontSize: 12 }}>Cookie settings →</button>
        </p>

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

      {tab === 'cookies' && <Cookies s={s} ro={ro} up={up} />}

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
