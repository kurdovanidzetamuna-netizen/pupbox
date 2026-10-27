'use client';
import { useEffect, useState } from 'react';
import SideDrawer from '@/components/SideDrawer';
import Dropdown from '@/components/Dropdown';
import { ActionButton } from '@/components/Toolbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}`, 'Content-Type': 'application/json' });

export const GROUPS = [
  { value: 'all', label: 'Everyone' },
  { value: 'onPlan', label: 'On a plan now' },
  { value: 'lapsed', label: 'Lapsed (had a plan)' },
  { value: 'never', label: 'Never had a plan' },
  { value: 'buyers', label: 'Paid at least once' },
  { value: 'tag', label: 'Customers with a tag' },
];

type Form = { titleEn: string; titleKa: string; bodyEn: string; bodyKa: string; ctaTextEn: string; ctaTextKa: string; link: string; group: string; tag: string; consentOnly: boolean; push: boolean };
const EMPTY: Form = { titleEn: '', titleKa: '', bodyEn: '', bodyKa: '', ctaTextEn: '', ctaTextKa: '', link: '', group: 'all', tag: '', consentOnly: true, push: true };

/** Write and send one message: to a group, or (from a customer) to chosen people. */
export default function Composer({ open, onClose, onSent, pushReady, ids, who }: { open: boolean; onClose: () => void; onSent: () => void; pushReady: boolean; ids?: string[]; who?: string }) {
  const [f, setF] = useState<Form>(EMPTY);
  const [count, setCount] = useState<{ customers: number; withPush: number } | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<'en' | 'ka'>('ka');
  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => { setF((x) => ({ ...x, [k]: v })); setError(''); };

  useEffect(() => { if (open) { setF(ids ? { ...EMPTY, consentOnly: false } : EMPTY); setError(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open || ids) return;
    fetch(`${API}/admin/customers?limit=5`, { headers: headers() }).then((r) => r.json()).then((d) => setTags(d.tags ?? [])).catch(() => {});
  }, [open, ids]);
  const audience = ids ? { group: 'customers', ids } : { group: f.group, tag: f.group === 'tag' ? f.tag : undefined, consentOnly: f.consentOnly };
  useEffect(() => {
    if (!open) return;
    setCount(null);
    const t = setTimeout(() => {
      fetch(`${API}/admin/messages/audience`, { method: 'POST', headers: headers(), body: JSON.stringify(audience) }).then((r) => (r.ok ? r.json() : null)).then(setCount).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [open, f.group, f.tag, f.consentOnly, ids?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = f.titleEn.trim() && f.titleKa.trim() && f.bodyEn.trim() && f.bodyKa.trim() && (!(f.ctaTextEn || f.ctaTextKa) || f.link.trim()) && (f.group !== 'tag' || f.tag || ids) && (count?.customers ?? 0) > 0;
  const dirty = JSON.stringify({ ...f, group: '', consentOnly: true, push: true }) !== JSON.stringify({ ...EMPTY, group: '', consentOnly: true, push: true });

  async function send() {
    if (!ready || !count) return;
    if (!confirm(`Send this to ${count.customers} customer${count.customers === 1 ? '' : 's'}? It can’t be taken back.`)) return;
    setBusy(true); setError('');
    const r = await fetch(`${API}/admin/messages`, { method: 'POST', headers: headers(), body: JSON.stringify({ ...f, link: f.link.trim() || undefined, ctaTextEn: f.ctaTextEn.trim() || undefined, ctaTextKa: f.ctaTextKa.trim() || undefined, group: undefined, tag: undefined, consentOnly: undefined, audience, push: pushReady && f.push }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError((Array.isArray(d.message) ? d.message[0] : d.message) || 'Not sent.'); return; }
    onSent();
  }

  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 10, outline: 'none', background: 'var(--white)', color: 'var(--slate-900)', fontFamily: 'inherit' };
  const lab: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', margin: '12px 0 5px' };
  const pair = (k1: keyof Form, k2: keyof Form, label: string, max: number, area = false) => (
    <>
      <label style={lab}>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
        {([[k1, '🇬🇪 Georgian'], [k2, '🇬🇧 English']] as const).map(([k, ph]) => area
          ? <textarea key={k} value={f[k] as string} onChange={(e) => set(k)(e.target.value as any)} maxLength={max} rows={3} placeholder={ph} aria-label={`${label} — ${ph}`} style={{ ...inp, resize: 'vertical' }} />
          : <input key={k} value={f[k] as string} onChange={(e) => set(k)(e.target.value as any)} maxLength={max} placeholder={ph} aria-label={`${label} — ${ph}`} style={inp} />)}
      </div>
    </>
  );
  const P = preview === 'en' ? { t: f.titleEn, b: f.bodyEn, c: f.ctaTextEn || f.ctaTextKa } : { t: f.titleKa, b: f.bodyKa, c: f.ctaTextKa || f.ctaTextEn };

  return (
    <SideDrawer open={open} onClose={onClose} dirty={dirty && !busy} title={who ? `Message to ${who}` : 'New message'} subtitle="Shows in the bell on the site; push where allowed."
      footer={(close) => (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ActionButton variant="secondary" onClick={close}>Cancel</ActionButton>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--slate-500)', textAlign: 'right' }}>{count ? `${count.customers} customer${count.customers === 1 ? '' : 's'}${pushReady && f.push ? ` · ${count.withPush} with push` : ''}` : '…'}</span>
          <ActionButton onClick={send} disabled={!ready || busy}>{busy ? 'Sending…' : 'Send'}</ActionButton>
        </div>
      )}>
      {!ids && (
        <>
          <label style={{ ...lab, marginTop: 0 }}>Who gets it</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Dropdown aria-label="Audience" value={f.group} onChange={set('group')} options={GROUPS} />
            {f.group === 'tag' && <Dropdown aria-label="Tag" placeholder={tags.length ? 'Choose a tag' : 'No tags yet'} value={f.tag} onChange={set('tag')} options={tags.map((t) => ({ value: t, label: t }))} />}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--slate-600)', marginTop: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.consentOnly} onChange={(e) => set('consentOnly')(e.target.checked)} />
            Only customers who agreed to offers <span style={{ color: 'var(--slate-400)' }}>(keep on for anything promotional)</span>
          </label>
        </>
      )}
      {pair('titleKa', 'titleEn', 'Title', 80)}
      {pair('bodyKa', 'bodyEn', 'Message', 400, true)}
      {pair('ctaTextKa', 'ctaTextEn', 'Button text (optional)', 30)}
      <label style={lab}>Button link</label>
      <input value={f.link} onChange={(e) => set('link')(e.target.value)} maxLength={500} placeholder="/prices, /shop/…, or https://…" aria-label="Button link" style={{ ...inp, fontFamily: 'monospace' }} />
      <p style={{ fontSize: 11.5, color: 'var(--slate-400)', margin: '4px 0 0' }}>A page on the site starts with “/”. Other sites open in a new tab. Tapping the message itself goes here too.</p>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: pushReady ? 'var(--slate-700)' : 'var(--slate-400)', marginTop: 14, cursor: pushReady ? 'pointer' : 'default' }}>
        <input type="checkbox" checked={pushReady && f.push} disabled={!pushReady} onChange={(e) => set('push')(e.target.checked)} />
        Also send as a push notification{!pushReady && ' (not set up on this server)'}
      </label>

      {/* What the customer sees */}
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-600)' }}>Preview</span>
        <span style={{ display: 'inline-flex', background: 'var(--slate-100)', borderRadius: 999, padding: 2 }}>
          {(['ka', 'en'] as const).map((l) => <button key={l} type="button" onClick={() => setPreview(l)} style={{ border: 'none', borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: preview === l ? 'var(--white)' : 'transparent', color: preview === l ? 'var(--slate-900)' : 'var(--slate-500)' }}>{l === 'ka' ? 'ქა' : 'EN'}</button>)}
        </span>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 12, padding: 14, borderRadius: 16, background: 'var(--teal-50)' }}>
        <span style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🔔</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--slate-900)' }}>{P.t || 'Title'}</div>
          <div style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{P.b || 'Your message…'}</div>
          {P.c && <span style={{ display: 'inline-block', marginTop: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--white)', borderRadius: 999, padding: '5px 12px' }}>{P.c} →</span>}
        </div>
      </div>
      {error && <p role="alert" style={{ color: 'var(--red-600)', fontSize: 13, marginTop: 12 }}>{error}</p>}
    </SideDrawer>
  );
}
