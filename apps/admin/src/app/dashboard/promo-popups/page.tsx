'use client';
import { useEffect, useMemo, useState } from 'react';
import SideDrawer from '@/components/SideDrawer';
import Dropdown from '@/components/Dropdown';
import DateField from '@/components/DateField';
import NumberField from '@/components/NumberField';
import { ActionButton, StatCard, StatCards } from '@/components/Toolbar';
import { ImageInput } from '../page-builder/_components/fields';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SLUG = 'config-promo-popups';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}` });

const TRIGGERS = [
  { value: 'on_load', label: 'As soon as the page opens' },
  { value: 'after_delay', label: 'After a few seconds' },
  { value: 'on_scroll', label: 'Halfway down the page' },
  { value: 'exit_intent', label: 'When they’re about to leave' },
];
const PAGES = [
  { value: 'all', label: 'Every page' }, { value: 'homepage', label: 'Home' }, { value: 'prices', label: 'Pricing' },
  { value: 'how-it-works', label: 'How it works' }, { value: 'shop', label: 'Shop' }, { value: 'build-box', label: 'Build a box' },
  { value: 'blog', label: 'Blog' }, { value: 'cart', label: 'Basket' }, { value: 'checkout', label: 'Checkout' }, { value: 'account', label: 'Account' },
];
const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'guests', label: 'Visitors who aren’t signed in' },
  { value: 'customers', label: 'Signed-in customers' },
];
const FREQUENCY = [
  { value: 'session', label: 'Once per visit' },
  { value: 'day', label: 'Once a day' },
  { value: 'always', label: 'Every time it applies' },
];

interface Popup {
  id: string;
  active: boolean;
  type: string;
  titleEn: string; titleKa: string;
  bodyEn: string; bodyKa: string;
  ctaTextEn: string; ctaTextKa: string;
  ctaUrl: string;
  couponCode: string;
  imageUrl: string;
  trigger: string;
  delaySeconds: number;
  showOnPages: string[];
  showOncePerSession: boolean;
  showOncePerDay: boolean;
  audience?: string;
  startsAt?: string;
  endsAt?: string;
}

const EMPTY: Omit<Popup, 'id'> = {
  active: true, type: 'discount', titleEn: '', titleKa: '', bodyEn: '', bodyKa: '',
  ctaTextEn: 'See the offer', ctaTextKa: 'შეთავაზების ნახვა', ctaUrl: '/prices', couponCode: '', imageUrl: '',
  trigger: 'after_delay', delaySeconds: 5, showOnPages: ['all'], showOncePerSession: true, showOncePerDay: false,
  audience: 'all', startsAt: '', endsAt: '',
};

const today = () => new Date().toISOString().slice(0, 10);
const nice = (d?: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Live now, waiting for its start date, past its end date, or switched off. */
function stateOf(p: Popup): { label: string; fg: string; bg: string } {
  if (!p.active) return { label: 'Off', fg: 'var(--slate-500)', bg: 'var(--slate-100)' };
  if (p.startsAt && p.startsAt > today()) return { label: `Starts ${nice(p.startsAt)}`, fg: 'var(--blue-700, #1d4ed8)', bg: 'var(--blue-50)' };
  if (p.endsAt && p.endsAt < today()) return { label: 'Ended', fg: 'var(--amber-700)', bg: 'var(--amber-50)' };
  return { label: 'Live', fg: 'var(--green-800)', bg: 'var(--green-50)' };
}
const freqOf = (p: Omit<Popup, 'id'>) => (p.showOncePerDay ? 'day' : p.showOncePerSession ? 'session' : 'always');

/**
 * Pop-ups on the site: an offer, a promo code, news. Each has words in both
 * languages, an optional picture and button (any page on the site or any
 * https:// address), where and to whom it shows, from and until when, and
 * how often. Views and button taps are counted.
 */
export default function PromoPopupsPage() {
  const [popups, setPopups] = useState<Popup[] | null>(null);
  const [stats, setStats] = useState<Record<string, { views: number; clicks: number }>>({});
  const [codes, setCodes] = useState<string[]>([]);
  const [editing, setEditing] = useState<Popup | 'new' | null>(null);
  const [form, setForm] = useState<Omit<Popup, 'id'>>(EMPTY);
  const [start, setStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'ka' | 'en'>('ka');

  async function load() {
    const [c, s] = await Promise.all([
      fetch(`${API}/cms/admin/${SLUG}`, { headers: auth() }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API}/cms/admin/popup-stats`, { headers: auth() }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);
    setPopups((c?.content?.popups ?? []) as Popup[]);
    setStats(Object.fromEntries((s as any[]).map((x) => [x.popupId, x])));
  }
  useEffect(() => {
    load();
    fetch(`${API}/admin/coupons`, { headers: auth() }).then((r) => (r.ok ? r.json() : [])).then((l: any[]) => setCodes(l.filter((x) => x.isActive && !x.stoppedAt).map((x) => x.code))).catch(() => {});
  }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t); } }, [toast]);

  async function saveAll(next: Popup[], msg: string) {
    setBusy(true); setError('');
    try {
      const r = await fetch(`${API}/cms`, { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ key: SLUG, slug: SLUG, title: 'Promo pop-ups', status: 'PUBLISHED', content: { popups: next } }) });
      if (!r.ok) throw new Error();
      setPopups(next); setToast(msg); return true;
    } catch { setError('Not saved — try again.'); return false; } finally { setBusy(false); }
  }

  function open(p: Popup | 'new') {
    const f = p === 'new' ? EMPTY : { ...EMPTY, ...p };
    setEditing(p); setForm(f); setStart(JSON.stringify(f)); setError('');
  }
  const set = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) => { setForm((x) => ({ ...x, [k]: v })); setError(''); };

  async function save() {
    if (!form.titleEn.trim() || !form.titleKa.trim()) { setError('Add the title in both languages.'); return; }
    if ((form.ctaTextEn.trim() || form.ctaTextKa.trim()) && !/^(\/\S*|https:\/\/\S+)$/.test(form.ctaUrl.trim())) { setError('The button link must start with / (a page on the site) or https://'); return; }
    if (form.startsAt && form.endsAt && form.endsAt < form.startsAt) { setError('It must end after it starts.'); return; }
    const clean = { ...form, ctaUrl: form.ctaUrl.trim(), couponCode: form.couponCode.trim().toUpperCase() };
    const list = popups ?? [];
    const next = editing === 'new' ? [...list, { ...clean, id: Math.random().toString(36).slice(2, 10) }] : list.map((p) => (p.id === (editing as Popup).id ? { ...clean, id: p.id } : p));
    if (await saveAll(next, editing === 'new' ? 'Pop-up created' : 'Saved')) setEditing(null);
  }

  const list = popups ?? [];
  const live = list.filter((p) => stateOf(p).label === 'Live').length;
  const views = list.reduce((n, p) => n + (stats[p.id]?.views ?? 0), 0);
  const clicks = list.reduce((n, p) => n + (stats[p.id]?.clicks ?? 0), 0);
  const P = lang === 'en' ? { t: form.titleEn, b: form.bodyEn, c: form.ctaTextEn } : { t: form.titleKa, b: form.bodyKa, c: form.ctaTextKa };
  const dirty = useMemo(() => JSON.stringify(form) !== start, [form, start]);

  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 10, outline: 'none', background: 'var(--white)', color: 'var(--slate-900)', fontFamily: 'inherit' };
  const lab: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', margin: '14px 0 5px' };
  const pair = (kKa: 'titleKa' | 'bodyKa' | 'ctaTextKa', kEn: 'titleEn' | 'bodyEn' | 'ctaTextEn', label: string, max: number, area = false) => (
    <>
      <label style={lab}>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
        {([[kKa, '🇬🇪 Georgian'], [kEn, '🇬🇧 English']] as const).map(([k, ph]) => area
          ? <textarea key={k} value={form[k]} onChange={(e) => set(k)(e.target.value)} maxLength={max} rows={3} placeholder={ph} aria-label={`${label} — ${ph}`} style={{ ...inp, resize: 'vertical' }} />
          : <input key={k} value={form[k]} onChange={(e) => set(k)(e.target.value)} maxLength={max} placeholder={ph} aria-label={`${label} — ${ph}`} style={inp} />)}
      </div>
    </>
  );

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Promo pop-ups</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 0', maxWidth: 620 }}>Offers and news that pop up on the site — with a picture, a promo code and a button to any page.</p>
        </div>
        <ActionButton onClick={() => open('new')}>＋ New pop-up</ActionButton>
      </div>

      <StatCards>
        <StatCard theme="teal" value={live} label="Live now" />
        <StatCard theme="slate" value={views.toLocaleString()} label="Times shown" />
        <StatCard theme="blue" value={clicks.toLocaleString()} label="Button taps" />
        <StatCard theme="amber" value={views ? `${((clicks / views) * 100).toFixed(1)}%` : '—'} label="Tap rate" />
      </StatCards>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 12 }}>
        {popups === null && <p style={{ color: 'var(--slate-400)', fontSize: 13 }}>Loading…</p>}
        {popups !== null && list.length === 0 && <p style={{ color: 'var(--slate-400)', fontSize: 13 }}>No pop-ups yet. Create one with “New pop-up”.</p>}
        {list.map((p) => {
          const st = stateOf(p), s = stats[p.id];
          return (
            <div key={p.id} style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: '100%', height: 110, objectFit: 'cover' }} /> : <div style={{ height: 6, background: 'var(--teal-100, #ccfbf1)' }} />}
              <div style={{ padding: '12px 14px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, color: st.fg, background: st.bg }}>{st.label}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--slate-400)' }}>{s?.views ?? 0} shown · {s?.clicks ?? 0} taps</span>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--slate-900)', marginTop: 8 }}>{p.titleKa || p.titleEn}</div>
                <div style={{ fontSize: 12.5, color: 'var(--slate-500)' }}>{p.titleEn}</div>
                <div style={{ fontSize: 11.5, color: 'var(--slate-400)', marginTop: 6 }}>
                  {TRIGGERS.find((t) => t.value === p.trigger)?.label} · {(p.showOnPages ?? ['all']).map((v) => PAGES.find((x) => x.value === v)?.label ?? v).join(', ')} · {AUDIENCES.find((a) => a.value === (p.audience ?? 'all'))?.label}
                  {(p.startsAt || p.endsAt) && <> · {p.startsAt ? nice(p.startsAt) : 'now'} → {p.endsAt ? nice(p.endsAt) : 'no end'}</>}
                </div>
                {p.couponCode && <code style={{ display: 'inline-block', marginTop: 6, fontSize: 11.5, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--teal-50)', borderRadius: 6, padding: '1px 7px' }}>{p.couponCode}</code>}
              </div>
              <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderTop: '1px solid var(--slate-100)' }}>
                <ActionButton variant="secondary" onClick={() => open(p)} style={{ padding: '5px 12px', fontSize: 12 }}>Edit</ActionButton>
                <ActionButton variant="secondary" onClick={() => saveAll(list.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)), p.active ? 'Switched off' : 'Switched on')} style={{ padding: '5px 12px', fontSize: 12 }}>{p.active ? 'Switch off' : 'Switch on'}</ActionButton>
                <span style={{ flex: 1 }} />
                <ActionButton variant="secondary" onClick={() => { if (confirm('Delete this pop-up? This can’t be undone.')) saveAll(list.filter((x) => x.id !== p.id), 'Deleted'); }} style={{ padding: '5px 12px', fontSize: 12, color: 'var(--red-600)' }}>Delete</ActionButton>
              </div>
            </div>
          );
        })}
      </div>
      {toast && <div role="status" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--slate-900)', color: 'var(--white)', padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, zIndex: 80 }}>✓ {toast}</div>}

      <SideDrawer open={editing !== null} onClose={() => setEditing(null)} dirty={dirty && !busy} width={620}
        title={editing === 'new' ? 'New pop-up' : 'Edit pop-up'} subtitle="Shown on the site in the visitor’s language."
        footer={(close) => (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ActionButton variant="secondary" onClick={close}>Cancel</ActionButton>
            <span style={{ flex: 1 }} />
            <ActionButton onClick={save} disabled={busy || (editing !== 'new' && !dirty)}>{busy ? 'Saving…' : editing === 'new' ? 'Create pop-up' : 'Save changes'}</ActionButton>
          </div>
        )}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.active} onChange={(e) => set('active')(e.target.checked)} /> Switched on
        </label>
        {pair('titleKa', 'titleEn', 'Title', 80)}
        {pair('bodyKa', 'bodyEn', 'Message', 300, true)}
        <label style={lab}>Picture <span style={{ fontWeight: 400, color: 'var(--slate-400)' }}>optional · wide, about 840×360</span></label>
        <ImageInput value={form.imageUrl} onChange={set('imageUrl')} />
        <label style={lab}>Promo code <span style={{ fontWeight: 400, color: 'var(--slate-400)' }}>optional · visitors tap to copy it</span></label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={form.couponCode} onChange={(e) => set('couponCode')(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} maxLength={30} placeholder="e.g. WELCOME10" aria-label="Promo code" style={{ ...inp, flex: '1 1 160px', width: 'auto', fontFamily: 'monospace' }} />
          {codes.length > 0 && <Dropdown aria-label="Pick a live promo code" placeholder="Pick a live code" value="" onChange={(v) => set('couponCode')(v)} options={codes.map((c) => ({ value: c, label: c }))} />}
        </div>
        {form.couponCode && codes.length > 0 && !codes.includes(form.couponCode) && <p style={{ fontSize: 12, color: 'var(--amber-700)', margin: '4px 0 0' }}>No live promo code is called {form.couponCode}. Check it in Promo codes.</p>}
        {pair('ctaTextKa', 'ctaTextEn', 'Button text (optional)', 30)}
        <label style={lab}>Button link</label>
        <input value={form.ctaUrl} onChange={(e) => set('ctaUrl')(e.target.value)} maxLength={500} placeholder="/prices, /shop/…, or https://…" aria-label="Button link" style={{ ...inp, fontFamily: 'monospace' }} />
        <p style={{ fontSize: 11.5, color: 'var(--slate-400)', margin: '4px 0 0' }}>A page on the site starts with “/”. Other websites open in a new tab.</p>

        <label style={lab}>When it pops up</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Dropdown aria-label="When" value={form.trigger} onChange={set('trigger')} options={TRIGGERS} />
          {form.trigger === 'after_delay' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--slate-500)' }}><NumberField stepper value={String(form.delaySeconds)} onChange={(v) => set('delaySeconds')(Math.max(1, Number(v) || 5))} min={1} max={120} ariaLabel="Seconds" /> seconds</span>}
        </div>
        {form.trigger === 'exit_intent' && <p style={{ fontSize: 11.5, color: 'var(--slate-400)', margin: '4px 0 0' }}>On phones (no mouse) it shows after 25 seconds instead.</p>}
        <label style={lab}>Where and to whom</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Dropdown multiple aria-label="Pages" label="Pages" placeholder="Pages" value={form.showOnPages} onChange={(v) => set('showOnPages')(v.includes('all') && !form.showOnPages.includes('all') ? ['all'] : v.filter((x) => x !== 'all').length ? v.filter((x) => x !== 'all') : ['all'])} options={PAGES} />
          <Dropdown aria-label="Who" value={form.audience ?? 'all'} onChange={set('audience')} options={AUDIENCES} />
          <Dropdown aria-label="How often" value={freqOf(form)} onChange={(v) => setForm((x) => ({ ...x, showOncePerDay: v === 'day', showOncePerSession: v === 'session' }))} options={FREQUENCY} />
        </div>
        <label style={lab}>Dates <span style={{ fontWeight: 400, color: 'var(--slate-400)' }}>optional</span></label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12.5, color: 'var(--slate-500)' }}>
          From <DateField compact value={form.startsAt ?? ''} onChange={(v) => set('startsAt')(v)} emptyLabel="Now" ariaLabel="Starts" /> until <DateField compact value={form.endsAt ?? ''} onChange={(v) => set('endsAt')(v)} min={form.startsAt || undefined} emptyLabel="No end" ariaLabel="Ends" />
        </div>

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-600)' }}>Preview</span>
          <span style={{ display: 'inline-flex', background: 'var(--slate-100)', borderRadius: 999, padding: 2 }}>
            {(['ka', 'en'] as const).map((l) => <button key={l} type="button" onClick={() => setLang(l)} style={{ border: 'none', borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: lang === l ? 'var(--white)' : 'transparent', color: lang === l ? 'var(--slate-900)' : 'var(--slate-500)' }}>{l === 'ka' ? 'ქა' : 'EN'}</button>)}
          </span>
        </div>
        <div style={{ marginTop: 8, borderRadius: 20, overflow: 'hidden', border: '1px solid var(--slate-200b)', background: '#fff', maxWidth: 380, marginInline: 'auto', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {form.imageUrl && <img src={form.imageUrl} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />}
          <div style={{ padding: '18px 20px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 19, color: '#0f172a' }}>{P.t || 'Title'}</div>
            {P.b && <div style={{ fontSize: 13.5, color: '#64748b', marginTop: 6 }}>{P.b}</div>}
            {form.couponCode && <div style={{ display: 'inline-block', marginTop: 12, padding: '8px 16px', borderRadius: 12, border: '1.5px dashed #5eead4', background: '#f0fdfa', fontFamily: 'monospace', fontWeight: 800, color: '#0f766e', letterSpacing: '.08em' }}>{form.couponCode}</div>}
            {P.c && <div style={{ marginTop: 12, padding: '11px 0', borderRadius: 999, background: '#0d9488', color: '#fff', fontWeight: 700, fontSize: 14 }}>{P.c}</div>}
          </div>
        </div>
        {error && <p role="alert" style={{ color: 'var(--red-600)', fontSize: 13, marginTop: 12 }}>{error}</p>}
      </SideDrawer>
    </div>
  );
}
