'use client';
import { useEffect, useState } from 'react';
import { SITE_STRINGS } from '@pupbox/content';
import { getOr } from '@/lib/api';
import { Field, Row, S, Section, Switch, btnSoft, card, inp, note } from './shared';

// ── Cookies ─────────────────────────────────────────────────────────────────
export const COOKIE_WORDS: { key: string; label: string; long?: boolean }[] = [
  { key: 'title', label: 'Title' },
  { key: 'text', label: 'Text', long: true },
  { key: 'accept', label: '“Accept all” button' },
  { key: 'needed', label: '“Only necessary” button' },
  { key: 'choose', label: '“Let me choose” button' },
  { key: 'save', label: '“Save my choice” button' },
  { key: 'necessaryHint', label: 'Necessary — what it’s for', long: true },
  { key: 'analyticsHint', label: 'Analytics — what it’s for', long: true },
  { key: 'adsHint', label: 'Ads — what it’s for', long: true },
];
export type Answers = { days: number; visitors: number; answers: number; all: number; needed: number; custom: number; analytics: number; ads: number; byDay: { date: string; all: number; needed: number; custom: number }[]; recent: { choice: string; analytics: boolean; ads: boolean; version: number; lang: string | null; path: string | null; createdAt: string; visitor: string }[] };

/** The cookie banner: whether and when it shows, its words, and what visitors answered. */
export function Cookies({ s, ro, up }: { s: S; ro: boolean; up: (f: (x: S) => S) => void }) {
  const [lang, setLang] = useState<'ka' | 'en'>('ka');
  const [days, setDays] = useState(30);
  const [a, setA] = useState<Answers | null>(null);
  useEffect(() => {
    setA(null);
    getOr<Answers | null>(`/admin/marketing/consents?days=${days}`, null).then(setA);
  }, [days]);
  const pct = (n: number) => (a?.visitors ? `${Math.round((n / a.visitors) * 100)}%` : '—');
  const peak = Math.max(1, ...(a?.byDay ?? []).map((d) => d.all + d.needed + d.custom));
  const c = s.consent;

  return (
    <>
      <section style={{ ...card, marginTop: 14, display: 'grid', gap: 4, background: c.banner ? 'var(--white)' : 'var(--amber-50)' }}>
        <Row title="Ask visitors about cookies" hint={c.banner
          ? 'A small card at the bottom asks each new visitor: accept all, only necessary, or choose. Nothing that tracks loads before they say yes.'
          : 'Off: every visitor is tracked straight away, without being asked. Only do this if your lawyer agrees.'}>
          <Switch on={c.banner} disabled={ro} label="Cookie banner" onChange={(v) => { if (!v && !confirm('Track every visitor without asking? Privacy law usually requires asking first.')) return; up((x) => { x.consent.banner = v; return x; }); }} />
        </Row>
        <div style={{ borderTop: '1px solid var(--slate-100)' }} />
        <Row title="Show it to every new visitor" hint={c.always ? 'Always asks, even before any tracking is connected.' : 'Asks only once something that tracks is connected (Ads & analytics, or other tools that wait for consent).'}>
          <Switch on={c.always} disabled={ro || !c.banner} label="Show to every visitor" onChange={(v) => up((x) => { x.consent.always = v; return x; })} />
        </Row>
      </section>

      <Section title="What visitors answered" hint="Each visitor’s latest answer, counted once. Kept as proof of consent — with a random browser ID only, no name, email or IP address.">
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d}
              style={{ padding: '5px 11px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${days === d ? 'var(--teal-500)' : 'var(--slate-200)'}`, background: days === d ? 'var(--teal-50)' : 'var(--white)', color: days === d ? 'var(--teal-800)' : 'var(--slate-600)' }}>
              Last {d} days
            </button>
          ))}
        </div>
        {!a ? <p style={{ color: 'var(--slate-400)', margin: 0, fontSize: 13 }}>Loading…</p> : a.visitors === 0 ? <p style={{ ...note, margin: 0 }}>No answers yet in this period.</p> : (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
              <Stat label="Visitors answered" value={a.visitors.toLocaleString()} />
              <Stat label="Accepted all" value={pct(a.all)} tone="teal" />
              <Stat label="Only necessary" value={pct(a.needed)} />
              <Stat label="Chose themselves" value={pct(a.custom)} />
              <Stat label="Allow analytics" value={pct(a.analytics)} />
              <Stat label="Allow ads" value={pct(a.ads)} />
            </div>
            {a.byDay.length > 1 && (
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--slate-600)', marginBottom: 6 }}>Day by day</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, overflowX: 'auto' }} aria-label="Answers per day">
                  {a.byDay.map((d) => {
                    const n = d.all + d.needed + d.custom;
                    return (
                      <div key={d.date} title={`${d.date}: ${d.all} all · ${d.custom} chose · ${d.needed} necessary`} style={{ flex: '1 0 8px', maxWidth: 22, height: `${(n / peak) * 100}%`, minHeight: 3, display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden' }}>
                        <span style={{ flex: d.needed, background: 'var(--slate-300)' }} />
                        <span style={{ flex: d.custom, background: 'var(--teal-300, #5eead4)' }} />
                        <span style={{ flex: d.all, background: 'var(--teal-600)' }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11.5, color: 'var(--slate-500)', flexWrap: 'wrap' }}>
                  <span><span style={{ color: 'var(--teal-600)' }}>■</span> Accepted all</span><span><span style={{ color: 'var(--teal-300, #5eead4)' }}>■</span> Chose</span><span><span style={{ color: 'var(--slate-300)' }}>■</span> Only necessary</span>
                </div>
              </div>
            )}
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--teal-700)' }}>Latest answers</summary>
              <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 4 }}>
                {a.recent.map((r, i) => (
                  <li key={i} style={{ fontSize: 12.5, display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--slate-600)', padding: '6px 8px', borderRadius: 8, background: 'var(--slate-50)' }}>
                    <b style={{ color: r.choice === 'all' ? 'var(--teal-700)' : 'var(--slate-700)' }}>{r.choice === 'all' ? 'Accepted all' : r.choice === 'needed' ? 'Only necessary' : `Chose: ${[r.analytics && 'analytics', r.ads && 'ads'].filter(Boolean).join(' + ') || 'nothing extra'}`}</b>
                    <span>{r.path || '/'}</span>
                    <span style={{ color: 'var(--slate-400)' }}>{(r.lang ?? '').toUpperCase()} · visitor {r.visitor} · {new Date(r.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </Section>

      <Section title="Banner words" hint="What the banner says. Leave a box empty to keep the standard words (shown faded).">
        <div role="tablist" aria-label="Language" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['ka', 'en'] as const).map((l) => (
            <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)}
              style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${lang === l ? 'var(--teal-500)' : 'var(--slate-200)'}`, background: lang === l ? 'var(--teal-50)' : 'var(--white)', color: lang === l ? 'var(--teal-800)' : 'var(--slate-600)' }}>
              {l === 'ka' ? '🇬🇪 Georgian' : '🇬🇧 English'}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {COOKIE_WORDS.map((w) => {
            const value = c.texts?.[lang]?.[w.key] ?? '';
            const def = SITE_STRINGS[`cookie.${w.key}`]?.[lang] ?? '';
            const set = (v: string) => up((x) => { x.consent.texts = x.consent.texts ?? { ka: {}, en: {} }; x.consent.texts[lang] = { ...(x.consent.texts[lang] ?? {}), [w.key]: v }; return x; });
            return (
              <Field key={w.key} label={w.label}>
                {w.long
                  ? <textarea value={value} disabled={ro} rows={3} maxLength={w.key === 'text' ? 600 : 200} placeholder={def} onChange={(e) => set(e.target.value)} style={{ ...inp, resize: 'vertical' }} aria-label={`${w.label} (${lang})`} />
                  : <input value={value} disabled={ro} maxLength={200} placeholder={def} onChange={(e) => set(e.target.value)} style={inp} aria-label={`${w.label} (${lang})`} />}
              </Field>
            );
          })}
          <Field label="Privacy page link" hint="Shown at the end of the banner text. A page on the site (/pages/privacy) or a full https:// address.">
            <input value={c.policy} disabled={ro} placeholder="/pages/privacy" onChange={(e) => up((x) => { x.consent.policy = e.target.value.trim(); return x; })} style={{ ...inp, maxWidth: 360 }} aria-label="Privacy page link" />
          </Field>
        </div>
      </Section>

      <Section title="Ask everyone again" hint="After changing what you use cookies for (a new tool, a new kind of ad), everyone should answer again. Their earlier answers stop counting and the banner shows to them once more.">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--slate-600)' }}>Banner version <b>{c.version}</b></span>
          {!ro && <button type="button" onClick={() => { if (confirm('Show the banner again to everyone, including people who already answered? Press Save afterwards.')) up((x) => { x.consent.version = x.consent.version + 1; return x; }); }} style={btnSoft}>Ask everyone again</button>}
        </div>
      </Section>
    </>
  );
}
export function Stat({ label, value, tone }: { label: string; value: string; tone?: 'teal' }) {
  return (
    <div style={{ borderRadius: 12, padding: '10px 12px', background: tone === 'teal' ? 'var(--teal-50)' : 'var(--slate-50)' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: tone === 'teal' ? 'var(--teal-800)' : 'var(--slate-900)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{label}</div>
    </div>
  );
}
