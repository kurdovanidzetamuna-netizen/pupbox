'use client';
import { useState, type CSSProperties, type ReactNode } from 'react';

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge').replace(/\/$/, '');

export type S = {
  verification: { google: string; bing: string; meta: string; yandex: string };
  google: { ga4: string; gtm: string; ads: string; adsLabel: string };
  meta: { pixel: string; capi: boolean; token: string; testCode: string };
  tiktok: { pixel: string };
  consent: { banner: boolean; always: boolean; version: number; policy: string; texts: { ka: Record<string, string>; en: Record<string, string> } };
  seo: { hideFromSearch: boolean };
  snippets: Snippet[];
};
export type Place = 'head' | 'body-start' | 'body-end';
export type Snippet = { id: string; tool: string; name: string; place: Place; code: string; consent: boolean; category: 'analytics' | 'ads'; on: boolean };
export type Sent = { at: string; ok: boolean; event: string; message: string };
export type Tab = 'connect' | 'code' | 'cookies' | 'checks' | 'feed' | 'texts';
export type Found = { ga4?: string; gtm?: string; ads?: string; adsLabel?: string; metaPixel?: string; tiktok?: string };
export const IN_CODE: Record<keyof Found, RegExp> = {
  ga4: /\b(G-[A-Z0-9]{4,16})\b/i,
  gtm: /\b(GTM-[A-Z0-9]{4,12})\b/i,
  ads: /\b(AW-\d{6,14})\b/i,
  adsLabel: /AW-\d{6,14}\/([A-Za-z0-9_-]{4,40})/,
  metaPixel: /fbq\(\s*['"]init['"]\s*,\s*['"]?(\d{8,20})|facebook\.com\/tr\?id=(\d{8,20})/,
  tiktok: /ttq\.load\(\s*['"]([A-Z0-9]{10,30})['"]|sdkid=([A-Z0-9]{10,30})/i,
};
export function found(text: string): Found {
  const out: Found = {};
  for (const k of Object.keys(IN_CODE) as (keyof Found)[]) {
    const m = text.match(IN_CODE[k]);
    const v = m && (m[1] ?? m[2]);
    if (v) out[k] = k === 'adsLabel' ? v : v.toUpperCase();
  }
  return out;
}
export const NAMES: Record<keyof Found, string> = { ga4: 'Google Analytics ID', gtm: 'Tag Manager ID', ads: 'Google Ads ID', adsLabel: 'Google Ads purchase label', metaPixel: 'Meta pixel ID', tiktok: 'TikTok pixel ID' };
/** Puts what was found into the settings. */
export function applyFound(x: S, f: Found): S {
  if (f.ga4) x.google.ga4 = f.ga4;
  if (f.gtm) x.google.gtm = f.gtm;
  if (f.ads) x.google.ads = f.ads;
  if (f.adsLabel) x.google.adsLabel = f.adsLabel;
  if (f.metaPixel) x.meta.pixel = f.metaPixel;
  if (f.tiktok) x.tiktok.pixel = f.tiktok;
  return x;
}
/** An ID box: typing keeps what's typed; pasting a whole snippet keeps just the ID. */
export const idFrom = (v: string, k: keyof Found, upper = true) => found(v)[k] ?? (upper ? v.toUpperCase() : v).trim();
// ── Small parts ────────────────────────────────────────────────────────────
export function Service({ icon, name, on, hint, children }: { icon: string; name: string; on: boolean; hint: string; children: ReactNode }) {
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
export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <details style={{ background: 'var(--slate-50)', borderRadius: 12, padding: '10px 12px' }}>
      <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--teal-700)' }}>Where do I find this?</summary>
      <ol style={{ margin: '8px 0 0', paddingLeft: 20, display: 'grid', gap: 6, fontSize: 13, color: 'var(--slate-700)', lineHeight: 1.5 }}>
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ol>
    </details>
  );
}
export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal-700)', fontWeight: 700 }}>{children} ↗</a>;
}
export function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
      <code style={{ ...code, flex: '1 1 260px', minWidth: 0, overflowWrap: 'anywhere' }}>{text}</code>
      <button type="button" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {}); }} style={btnSoft}>{done ? 'Copied ✓' : 'Copy'}</button>
    </div>
  );
}
export function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section style={{ ...card, marginTop: 14 }}>
      <h2 style={h2}>{title}</h2>
      <p style={hintP}>{hint}</p>
      {children}
    </section>
  );
}
export function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
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
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-700)' }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--slate-500)', margin: '1px 0 6px', lineHeight: 1.45 }}>{hint}</div>}
      <div style={{ marginTop: hint ? 0 : 6 }}>{children}</div>
    </div>
  );
}
export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      style={{ flexShrink: 0, width: 46, height: 26, borderRadius: 99, border: 'none', padding: 3, cursor: disabled ? 'default' : 'pointer', background: on ? 'var(--teal-600)' : 'var(--slate-300)', opacity: disabled ? 0.55 : 1, transition: 'background .15s', display: 'inline-flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
      <span style={{ width: 20, height: 20, borderRadius: 99, background: '#fff' }} />
    </button>
  );
}

export const card: CSSProperties = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 18, padding: 18 };
export const inp: CSSProperties = { width: '100%', border: '1.5px solid var(--slate-200)', borderRadius: 10, padding: '8px 11px', fontSize: 14, background: 'var(--white)', color: 'var(--slate-900)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', minWidth: 0 };
export const lbl: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', cursor: 'pointer' };
export const btnSoft: CSSProperties = { padding: '8px 13px', borderRadius: 10, border: '1.5px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-700)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
export const code: CSSProperties = { fontSize: 13, padding: '8px 12px', borderRadius: 10, background: 'var(--slate-100)', color: 'var(--slate-700)' };
export const note: CSSProperties = { fontSize: 12.5, color: 'var(--slate-600)', background: 'var(--slate-50)', borderRadius: 10, padding: '8px 12px', lineHeight: 1.5 };
export const h2: CSSProperties = { margin: 0, fontSize: 15.5, fontWeight: 800, color: 'var(--slate-900)' };
export const hintP: CSSProperties = { margin: '3px 0 14px', fontSize: 12.5, color: 'var(--slate-500)', lineHeight: 1.5 };
export const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 };
