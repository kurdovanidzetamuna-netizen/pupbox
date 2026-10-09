'use client';
import { useEffect, useState } from 'react';
import { ActionButton } from '../../../components/Toolbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SLUG = 'config-settings';

/** Shop rules admin can change without a developer. Stored as the CMS row config-settings. */
export default function SettingsPage() {
  const [content, setContent] = useState<any>({});
  const [freeHours, setFreeHours] = useState('12');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/cms/${SLUG}`).then(r => (r.ok ? r.json() : null)).then(row => {
      const c = row?.content ?? {};
      setContent(c);
      if (c.cancellation?.freeHours != null) setFreeHours(String(c.cancellation.freeHours));
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    const hours = Number(freeHours);
    if (!Number.isFinite(hours) || hours < 0 || hours > 720) return setMsg({ ok: false, text: 'Enter a number of hours from 0 to 720.' });
    setSaving(true); setMsg(null);
    const next = { ...content, cancellation: { ...(content.cancellation ?? {}), freeHours: hours } };
    const res = await fetch(`${API}/cms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      body: JSON.stringify({ key: SLUG, slug: SLUG, title: 'Settings', status: 'PUBLISHED', content: next }),
    });
    setSaving(false);
    if (res.ok) { setContent(next); setMsg({ ok: true, text: 'Saved. Applies to cancellations from now on.' }); }
    else setMsg({ ok: false, text: res.status === 401 ? 'Your session expired — sign in again.' : `Not saved (error ${res.status}).` });
  }

  const hours = Number(freeHours) || 0;
  return (
    <div style={{ padding: 28, maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>⚙️ Settings</h1>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 24px' }}>Shop rules that take effect straight away.</p>

      <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 14, padding: 22 }}>
        <p style={{ fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px', fontSize: 15 }}>Cancelling a subscription</p>
        <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: '0 0 18px', lineHeight: 1.55 }}>
          Within the free window after paying, and before any box ships, a customer can cancel for free and gets everything back.
          After it, they keep the box for the month they cancel in; later months stop and are refunded at the plan’s monthly price.
        </p>
        {loading ? <p style={{ color: 'var(--slate-400)' }}>Loading…</p> : (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)' }}>
              Free cancellation window:
              <input type="number" min={0} max={720} value={freeHours} onChange={e => { setFreeHours(e.target.value); setMsg(null); }}
                style={{ width: 80, border: '1px solid var(--slate-200)', borderRadius: 8, padding: '6px 10px', fontSize: 14, background: 'var(--white)', color: 'var(--slate-900)' }} />
              hours after paying
            </label>
            <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 0 18px' }}>
              Example — a 6-month plan for ₾255: cancelling {hours ? `within the first ${hours} hour${hours === 1 ? '' : 's'}` : '(no free window)'} gives ₾255 back and no box;
              cancelling later in October keeps the October box and gives back 5 × ₾42.50 = ₾212.50.
            </p>
            {msg && <p style={{ fontSize: 13, margin: '0 0 12px', color: msg.ok ? 'var(--teal-700)' : 'var(--red-600)' }}>{msg.text}</p>}
            <ActionButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</ActionButton>
          </>
        )}
      </div>
    </div>
  );
}
