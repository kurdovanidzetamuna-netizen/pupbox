'use client';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { ActionButton } from '../../../components/Toolbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SLUG = 'config-settings';

const card: CSSProperties = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 14, padding: 22, marginBottom: 16 };
const numInput: CSSProperties = { width: 80, border: '1px solid var(--slate-200)', borderRadius: 8, padding: '6px 10px', fontSize: 14, background: 'var(--white)', color: 'var(--slate-900)' };
const help: CSSProperties = { fontSize: 13, color: 'var(--slate-500)', margin: '0 0 16px', lineHeight: 1.55 };

function Card({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div style={card}>
      <p style={{ fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px', fontSize: 15 }}>{title}</p>
      <p style={help}>{intro}</p>
      {children}
    </div>
  );
}

/** Shop rules admin can change without a developer. Stored as the CMS row config-settings; they apply at once. */
export default function SettingsPage() {
  const [content, setContent] = useState<any>({});
  const [v, setV] = useState({ freeHours: '12', noticeDays: '7', graceDays: '3', orderEmail: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/cms/${SLUG}`).then(r => (r.ok ? r.json() : null)).then(row => {
      const c = row?.content ?? {};
      setContent(c);
      setV({
        freeHours: String(c.cancellation?.freeHours ?? 12),
        noticeDays: String(c.renewal?.noticeDays ?? 7),
        graceDays: String(c.renewal?.graceDays ?? 3),
        orderEmail: c.notifications?.orderEmail ?? '',
      });
    }).finally(() => setLoading(false));
  }, []);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => { setV(x => ({ ...x, [k]: e.target.value })); setMsg(null); };

  async function save() {
    const freeHours = Number(v.freeHours), noticeDays = Number(v.noticeDays), graceDays = Number(v.graceDays);
    if (!(freeHours >= 0 && freeHours <= 720)) return setMsg({ ok: false, text: 'Free cancellation: 0 to 720 hours.' });
    if (!(noticeDays >= 1 && noticeDays <= 60)) return setMsg({ ok: false, text: 'Renewal reminder: 1 to 60 days.' });
    if (!(graceDays >= 0 && graceDays <= 60)) return setMsg({ ok: false, text: 'Time to pay a renewal: 0 to 60 days.' });
    const orderEmail = v.orderEmail.trim();
    if (orderEmail && !/^\S+@\S+\.\S+$/.test(orderEmail)) return setMsg({ ok: false, text: 'Enter a valid email address, or leave it empty.' });
    setSaving(true); setMsg(null);
    const next = {
      ...content,
      cancellation: { ...(content.cancellation ?? {}), freeHours },
      renewal: { ...(content.renewal ?? {}), noticeDays, graceDays },
      notifications: { ...(content.notifications ?? {}), orderEmail },
    };
    const res = await fetch(`${API}/cms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      body: JSON.stringify({ key: SLUG, slug: SLUG, title: 'Settings', status: 'PUBLISHED', content: next }),
    });
    setSaving(false);
    if (res.ok) { setContent(next); setMsg({ ok: true, text: 'Saved. Applies from now on.' }); }
    else setMsg({ ok: false, text: res.status === 401 ? 'Your session expired — sign in again.' : `Not saved (error ${res.status}).` });
  }

  const hours = Number(v.freeHours) || 0;
  return (
    <div style={{ padding: 28, maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>⚙️ Settings</h1>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 24px' }}>Shop rules that take effect straight away.</p>
      {loading ? <p style={{ color: 'var(--slate-400)' }}>Loading…</p> : (
        <>
          <Card title="Cancelling a subscription" intro="Within the free window after paying, and before any box ships, a customer can cancel for free and gets everything back. After it, they keep the box for the month they cancel in; later months stop and are refunded at the plan’s monthly price.">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)' }}>
              Free cancellation window: <input type="number" min={0} max={720} value={v.freeHours} onChange={set('freeHours')} style={numInput} /> hours after paying
            </label>
            <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 0 0' }}>
              Example — a 6-month plan for ₾255: cancelling {hours ? `within the first ${hours} hour${hours === 1 ? '' : 's'}` : '(no free window)'} gives ₾255 back and no box;
              cancelling later in October keeps the October box and gives back 5 × ₾42.50 = ₾212.50.
            </p>
          </Card>

          <Card title="Renewing a subscription" intro="Customers who chose to renew get an email with a link to pay for the next term. Paying adds the next term’s boxes; not paying in time lets the plan end.">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)', marginBottom: 10 }}>
              Send the payment link <input type="number" min={1} max={60} value={v.noticeDays} onChange={set('noticeDays')} style={numInput} /> days before the term ends
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)' }}>
              End the plan if unpaid <input type="number" min={0} max={60} value={v.graceDays} onChange={set('graceDays')} style={numInput} /> days after the term ends
            </label>
          </Card>

          <Card title="New order emails" intro="When an order is paid, a short summary goes to this address. Leave empty for none.">
            <input type="email" value={v.orderEmail} onChange={set('orderEmail')} placeholder="orders@pupbox.ge"
              style={{ ...numInput, width: '100%', boxSizing: 'border-box' }} />
          </Card>

          {msg && <p style={{ fontSize: 13, margin: '0 0 12px', color: msg.ok ? 'var(--teal-700)' : 'var(--red-600)' }}>{msg.text}</p>}
          <ActionButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</ActionButton>
        </>
      )}
    </div>
  );
}
