'use client';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { ActionButton } from '../../../components/Toolbar';
import { NumInput } from '@/components/NumberField';
import { getOr, post } from '@/lib/api';

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
  const [v, setV] = useState({ unpaidHours: '2', extraDays: '7', freeHours: '12', noticeDays: '7', graceDays: '3', orderEmail: '', boxMin: '3', boxFee: '5', boxMonthly: '10', mysteryOn: true, mysteryPrice: '15', mysteryMax: '2' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getOr<any>(`/cms/admin/${SLUG}`, null).then(row => {
      const c = row?.content ?? {};
      setContent(c);
      setV({
        unpaidHours: String(c.orders?.unpaidHours ?? 2),
        extraDays: String(c.orders?.extraPaymentDays ?? 7),
        freeHours: String(c.cancellation?.freeHours ?? 12),
        noticeDays: String(c.renewal?.noticeDays ?? 7),
        graceDays: String(c.renewal?.graceDays ?? 3),
        orderEmail: c.notifications?.orderEmail ?? '',
        boxMin: String(c.customBox?.minItems ?? 3),
        boxFee: String(c.customBox?.packingFee ?? 5),
        boxMonthly: String(c.customBox?.monthlyDiscount ?? 10),
        mysteryOn: c.customBox?.mystery?.enabled !== false,
        mysteryPrice: String(c.customBox?.mystery?.price ?? 15),
        mysteryMax: String(c.customBox?.mystery?.max ?? 2),
      });
    }).finally(() => setLoading(false));
  }, []);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => { setV(x => ({ ...x, [k]: e.target.value })); setMsg(null); };

  async function save() {
    const freeHours = Number(v.freeHours), noticeDays = Number(v.noticeDays), graceDays = Number(v.graceDays);
    if (!(freeHours >= 0 && freeHours <= 720)) return setMsg({ ok: false, text: 'Free cancellation: 0 to 720 hours.' });
    if (!(noticeDays >= 1 && noticeDays <= 60)) return setMsg({ ok: false, text: 'Renewal reminder: 1 to 60 days.' });
    if (!(graceDays >= 0 && graceDays <= 60)) return setMsg({ ok: false, text: 'Time to pay a renewal: 0 to 60 days.' });
    const minItems = Number(v.boxMin), packingFee = Number(v.boxFee), monthlyDiscount = Number(v.boxMonthly);
    if (!(Number.isInteger(minItems) && minItems >= 1 && minItems <= 50)) return setMsg({ ok: false, text: 'Custom box: at least 1 to 50 items.' });
    if (!(packingFee >= 0 && packingFee <= 500)) return setMsg({ ok: false, text: 'Custom box packing fee: ₾0 to ₾500.' });
    if (!(monthlyDiscount >= 0 && monthlyDiscount <= 90)) return setMsg({ ok: false, text: 'Monthly box discount: 0 to 90%.' });
    const mPrice = Number(v.mysteryPrice), mMax = Number(v.mysteryMax);
    if (!(mPrice >= 0 && mPrice <= 500)) return setMsg({ ok: false, text: 'Mystery item price: ₾0 to ₾500.' });
    if (!(Number.isInteger(mMax) && mMax >= 1 && mMax <= 10)) return setMsg({ ok: false, text: 'Mystery items per box: 1 to 10.' });
    const unpaidHours = Number(v.unpaidHours), extraPaymentDays = Number(v.extraDays);
    if (!(Number.isInteger(unpaidHours) && unpaidHours >= 1 && unpaidHours <= 168)) return setMsg({ ok: false, text: 'Unpaid orders: 1 to 168 hours.' });
    if (!(Number.isInteger(extraPaymentDays) && extraPaymentDays >= 1 && extraPaymentDays <= 30)) return setMsg({ ok: false, text: 'Extra payments: 1 to 30 days.' });
    const orderEmail = v.orderEmail.trim();
    if (orderEmail && !/^\S+@\S+\.\S+$/.test(orderEmail)) return setMsg({ ok: false, text: 'Enter a valid email address, or leave it empty.' });
    setSaving(true); setMsg(null);
    // Start from what's saved now: other pages (friend codes) keep their parts in the same record.
    const latest = await getOr<any>(`/cms/admin/${SLUG}`, null);
    const next = {
      ...content,
      ...(latest?.content ?? {}),
      orders: { ...(content.orders ?? {}), unpaidHours, extraPaymentDays },
      cancellation: { ...(content.cancellation ?? {}), freeHours },
      renewal: { ...(content.renewal ?? {}), noticeDays, graceDays },
      notifications: { ...(content.notifications ?? {}), orderEmail },
      customBox: { ...(content.customBox ?? {}), minItems, packingFee, monthlyDiscount, mystery: { enabled: v.mysteryOn, price: mPrice, max: mMax } },
    };
    try {
      await post('/cms', { key: SLUG, slug: SLUG, title: 'Settings', status: 'PUBLISHED', content: next });
      setContent(next); setMsg({ ok: true, text: 'Saved. Applies from now on.' });
    } catch (e: any) {
      setMsg({ ok: false, text: e.status === 401 ? 'Your session expired — sign in again.' : `Not saved (error ${e.status ?? 'no connection'}).` });
    } finally { setSaving(false); }
  }

  const hours = Number(v.freeHours) || 0;
  return (
    <div style={{ padding: 28, maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>⚙️ Settings</h1>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 24px' }}>Shop rules that take effect straight away.</p>
      {loading ? <p style={{ color: 'var(--slate-400)' }}>Loading…</p> : (
        <>
          <Card title="Unpaid orders" intro="An order that isn’t paid in time is cancelled by itself: its stock goes back on sale and its promo code can be used again. A payment that still arrives later brings the order back.">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)', marginBottom: 10, flexWrap: 'wrap' }}>
              Cancel an unpaid order after <NumInput min={1} max={168} value={v.unpaidHours} onChange={set('unpaidHours')} style={numInput} /> hours
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)', flexWrap: 'wrap' }}>
              Extra payment for added items: wait <NumInput min={1} max={30} value={v.extraDays} onChange={set('extraDays')} style={numInput} /> days
            </label>
            <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 0 0' }}>The “Order not paid yet” text (Text messages) only goes while the order is still open.</p>
          </Card>

          <Card title="Cancelling a subscription" intro="Within the free window after paying, and before any box ships, a customer can cancel for free and gets everything back. After it, they keep the box for the month they cancel in; later months stop and are refunded at the plan’s monthly price.">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)' }}>
              Free cancellation window: <NumInput min={0} max={720} value={v.freeHours} onChange={set('freeHours')} style={numInput} /> hours after paying
            </label>
            <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 0 0' }}>
              Example — a 6-month plan for ₾255: cancelling {hours ? `within the first ${hours} hour${hours === 1 ? '' : 's'}` : '(no free window)'} gives ₾255 back and no box;
              cancelling later in October keeps the October box and gives back 5 × ₾42.50 = ₾212.50.
            </p>
          </Card>

          <Card title="Renewing a subscription" intro="Customers who chose to renew get an email with a link to pay for the next term. Paying adds the next term’s boxes; not paying in time lets the plan end.">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)', marginBottom: 10 }}>
              Send the payment link <NumInput min={1} max={60} value={v.noticeDays} onChange={set('noticeDays')} style={numInput} /> days before the term ends
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)' }}>
              End the plan if unpaid <NumInput min={0} max={60} value={v.graceDays} onChange={set('graceDays')} style={numInput} /> days after the term ends
            </label>
          </Card>

          <Card title="Build-your-own box" intro="Customers fill a box with products marked “Can go in a custom box” (on each product’s page), and buy it once or every month. Its price is the products’ shop prices plus the packing fee; a monthly box gets the discount on the products.">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)', marginBottom: 10 }}>
              At least <NumInput min={1} max={50} value={v.boxMin} onChange={set('boxMin')} style={numInput} /> items in a box
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)', marginBottom: 10 }}>
              Packing fee ₾ <NumInput min={0} max={500} step="0.5" value={v.boxFee} onChange={set('boxFee')} style={numInput} /> per box
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)' }}>
              Monthly box: <NumInput min={0} max={90} value={v.boxMonthly} onChange={set('boxMonthly')} style={numInput} /> % off the products
            </label>
            <div style={{ borderTop: '1px solid var(--slate-200b)', margin: '16px 0 12px' }} />
            <p style={{ fontWeight: 700, color: 'var(--slate-800)', fontSize: 13.5, margin: '0 0 4px' }}>🎁 Mystery item</p>
            <p style={{ ...help, marginBottom: 10 }}>Customers can add a surprise without knowing what it is. You pack one of the products marked “Can be a mystery item” (on each product’s page); the monthly packing list shows how many and what you can choose from.</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)', marginBottom: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={v.mysteryOn} onChange={(e) => { setV(x => ({ ...x, mysteryOn: e.target.checked })); setMsg(null); }} /> Offer a mystery item
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)', marginBottom: 10, opacity: v.mysteryOn ? 1 : 0.5 }}>
              Price ₾ <NumInput min={0} max={500} step="0.5" value={v.mysteryPrice} onChange={set('mysteryPrice')} disabled={!v.mysteryOn} style={numInput} /> each
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate-700)', opacity: v.mysteryOn ? 1 : 0.5 }}>
              At most <NumInput min={1} max={10} value={v.mysteryMax} onChange={set('mysteryMax')} disabled={!v.mysteryOn} style={numInput} /> per box
            </label>
          </Card>

          <Card title="New order emails" intro="When an order is paid, a short summary goes to this address. Leave empty for none.">
            <input type="email" value={v.orderEmail} onChange={set('orderEmail')} placeholder="orders@pupbox.ge"
              style={{ ...numInput, width: '100%', boxSizing: 'border-box' }} />
          </Card>

          <Link href="/dashboard/sms" style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
            <span style={{ fontSize: 24 }}>📱</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, color: 'var(--slate-900)', fontSize: 15 }}>Text messages (SMS)</span>
              <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>Team numbers, which messages go out, quiet hours, codes and renewal retries — on their own page.</span>
            </span>
            <span style={{ color: 'var(--teal-700)', fontWeight: 800, fontSize: 13 }}>Open →</span>
          </Link>

          {msg && <p style={{ fontSize: 13, margin: '0 0 12px', color: msg.ok ? 'var(--teal-700)' : 'var(--red-600)' }}>{msg.text}</p>}
          <ActionButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</ActionButton>
        </>
      )}
    </div>
  );
}
