'use client';
import { useEffect, useRef, useState } from 'react';
import { ActionButton } from '@/components/Toolbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}`, 'Content-Type': 'application/json' });

type Text = { subject: string; heading: string; body: string; button?: string; after?: string };
type Kind = { key: string; label: string; about: string; fillIns: string[]; ka: { builtIn: Text; saved: Text | null }; en: { builtIn: Text; saved: Text | null } };

/** What each fill-in becomes, so the team knows what they're placing. */
const FILL: Record<string, string> = {
  firstName: 'Customer’s first name', orderId: 'Order number', total: 'Amount paid', trackingNumber: 'Tracking number',
  dogName: 'Dog’s name', boxNumber: 'Box number', boxesTotal: 'Boxes in the plan', planName: 'Plan name', amount: 'Amount',
  renewsOn: 'Renewal date', recipientName: 'Friend’s name', buyerName: 'Buyer’s name', message: 'Gift note text', boxes: 'Number of boxes',
  couponCode: 'Promo code', code: '6-digit code', codeBox: 'The code, large', giftNote: 'The gift note, boxed',
};

/**
 * Admin → Emails: the words of every email customers get, in Georgian and
 * English. Change the subject, heading, text, button and small print, put in
 * fill-ins like {{firstName}}, see it as the customer will, save — or go back
 * to the original. The design and links stay the same.
 */
export default function EmailsPage() {
  const [data, setData] = useState<{ sending: boolean; items: Kind[] } | null>(null);
  const [key, setKey] = useState('welcome');
  const [lang, setLang] = useState<'ka' | 'en'>('ka');
  const [form, setForm] = useState<Text | null>(null);
  const [start, setStart] = useState('');
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const focused = useRef<{ field: keyof Text; el: HTMLInputElement | HTMLTextAreaElement } | null>(null);

  const load = () => fetch(`${API}/admin/email-templates`, { headers: headers() }).then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const kind = data?.items.find((k) => k.key === key);
  // Opening an email (or switching language) loads its saved words, else the original.
  useEffect(() => {
    if (!kind) return;
    const t = kind[lang].saved ?? kind[lang].builtIn;
    setForm({ ...t }); setStart(JSON.stringify(t)); setMsg('');
  }, [key, lang, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preview follows the text, a moment after typing stops.
  useEffect(() => {
    if (!form) return;
    const t = setTimeout(() => {
      fetch(`${API}/admin/email-templates/${key}/${lang}/preview`, { method: 'POST', headers: headers(), body: JSON.stringify(form) })
        .then((r) => (r.ok ? r.json() : null)).then((p) => p && setPreview(p)).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [form, key, lang]);

  const dirty = !!form && JSON.stringify(form) !== start;
  const custom = !!kind?.[lang].saved;
  function pick(k: string, l = lang) {
    if (dirty && !confirm('Discard your changes to this email?')) return;
    setKey(k); setLang(l);
  }
  function insert(name: string) {
    if (!form) return;
    const f = focused.current;
    const field: keyof Text = f?.field ?? 'body';
    const value = (form[field] as string) ?? '';
    const at = f?.el.selectionStart ?? value.length;
    const next = `${value.slice(0, at)}{{${name}}}${value.slice(f?.el.selectionEnd ?? at)}`;
    setForm({ ...form, [field]: next });
  }
  async function save() {
    if (!form) return;
    setBusy(true); setMsg('');
    const r = await fetch(`${API}/admin/email-templates/${key}/${lang}`, { method: 'PUT', headers: headers(), body: JSON.stringify(form) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg((Array.isArray(d.message) ? d.message[0] : d.message) || 'Not saved.'); return; }
    setMsg('✓ Saved — the next email uses these words.'); load();
  }
  async function reset() {
    if (!confirm('Go back to the original words for this email?')) return;
    setBusy(true);
    await fetch(`${API}/admin/email-templates/${key}/${lang}`, { method: 'DELETE', headers: headers() });
    setBusy(false); setMsg('Back to the original words.'); load();
  }

  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 10, outline: 'none', background: 'var(--white)', color: 'var(--slate-900)', fontFamily: 'inherit' };
  const lab: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', margin: '12px 0 5px' };
  const field = (k: keyof Text, label: string, rows = 0, hint?: string) => form && (form[k] !== undefined || k === 'after') && (
    <>
      <label style={lab}>{label}{hint && <span style={{ fontWeight: 400, color: 'var(--slate-400)' }}> · {hint}</span>}</label>
      {rows
        ? <textarea value={form[k] ?? ''} rows={rows} onFocus={(e) => (focused.current = { field: k, el: e.currentTarget })} onChange={(e) => setForm({ ...form, [k]: e.target.value })} aria-label={label} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
        : <input value={form[k] ?? ''} onFocus={(e) => (focused.current = { field: k, el: e.currentTarget })} onChange={(e) => setForm({ ...form, [k]: e.target.value })} aria-label={label} style={inp} />}
    </>
  );

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Emails</h1>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 16px', maxWidth: 680 }}>The words of every email customers get, in Georgian and English. The design, logo and links stay the same.</p>
      {data && !data.sending && <p style={{ fontSize: 12.5, color: 'var(--amber-700)', background: 'var(--amber-50)', borderRadius: 10, padding: '10px 14px', margin: '0 0 16px' }}>Emails aren’t being sent yet: the email service key (Resend) isn’t set on this server. You can still edit them.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16, alignItems: 'start' }}>
        {/* Which email */}
        <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, overflow: 'hidden' }}>
          {(data?.items ?? []).map((k) => (
            <button key={k.key} type="button" onClick={() => pick(k.key)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', borderBottom: '1px solid var(--slate-100)', cursor: 'pointer', background: k.key === key ? 'var(--teal-50)' : 'var(--white)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: k.key === key ? 'var(--teal-700)' : 'var(--slate-800)' }}>
                {k.label}
                {(k.ka.saved || k.en.saved) && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--white)', border: '1px solid var(--teal-200)', borderRadius: 999, padding: '0 6px' }}>edited</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 2 }}>{k.about}</div>
            </button>
          ))}
          {!data && <p style={{ padding: 16, fontSize: 13, color: 'var(--slate-400)' }}>Loading…</p>}
        </div>

        {/* The words */}
        {kind && form && (
          <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, padding: '16px 18px', gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <b style={{ fontSize: 15, color: 'var(--slate-900)' }}>{kind.label}</b>
              <span style={{ display: 'inline-flex', background: 'var(--slate-100)', borderRadius: 999, padding: 2 }}>
                {(['ka', 'en'] as const).map((l) => <button key={l} type="button" onClick={() => pick(key, l)} style={{ border: 'none', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: lang === l ? 'var(--white)' : 'transparent', color: lang === l ? 'var(--slate-900)' : 'var(--slate-500)' }}>{l === 'ka' ? 'ქართული' : 'English'}{kind[l].saved ? ' •' : ''}</button>)}
              </span>
            </div>
            {field('subject', 'Subject')}
            {field('heading', 'Heading')}
            {field('body', 'Text', 8, 'an empty line starts a new paragraph · **bold**')}
            {kind[lang].builtIn.button !== undefined && field('button', 'Button text')}
            {field('after', 'Small print', 3, 'optional')}
            <label style={lab}>Fill-ins <span style={{ fontWeight: 400, color: 'var(--slate-400)' }}>· tap to put one where the cursor is · a paragraph whose fill-in is empty is left out</span></label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {kind.fillIns.map((f) => <button key={f} type="button" onClick={() => insert(f)} title={FILL[f] ?? f} style={{ border: '1px solid var(--teal-200)', background: 'var(--teal-50)', color: 'var(--teal-700)', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{FILL[f] ?? f}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              {custom && <ActionButton variant="secondary" onClick={reset} disabled={busy}>↺ Original words</ActionButton>}
              {dirty && <ActionButton variant="secondary" onClick={() => setForm(JSON.parse(start))} disabled={busy}>Cancel</ActionButton>}
              <span style={{ flex: 1 }} />
              <ActionButton onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save'}</ActionButton>
            </div>
            {msg && <p role="status" style={{ fontSize: 12.5, color: msg.startsWith('✓') || msg.startsWith('Back') ? 'var(--teal-700)' : 'var(--red-600)', margin: '10px 0 0' }}>{msg}</p>}
          </div>
        )}

        {/* As the customer sees it */}
        {preview && (
          <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--slate-100)', fontSize: 12.5, color: 'var(--slate-500)' }}>Subject: <b style={{ color: 'var(--slate-900)' }}>{preview.subject}</b></div>
            <iframe title="Email preview" srcDoc={preview.html} sandbox="" style={{ width: '100%', height: 560, border: 'none', display: 'block', background: '#f8fafc' }} />
          </div>
        )}
      </div>
    </div>
  );
}
