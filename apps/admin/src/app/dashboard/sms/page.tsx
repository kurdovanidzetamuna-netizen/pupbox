'use client';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Dropdown from '@/components/Dropdown';
import { NumInput } from '@/components/NumberField';
import TimeInput from '@/components/TimeInput';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}` });
const err = (d: any, f: string) => (Array.isArray(d?.message) ? d.message[0] : d?.message) || f;

type Topic = 'orders' | 'signups' | 'payments';
type Team = { name: string; phone: string; active: boolean; topics: Topic[] };
type S = {
  enabled: boolean; apiKey: string; sender: string; team: Team[];
  customer: Record<string, boolean>;
  quiet: { enabled: boolean; from: string; to: string; team: boolean };
  codes: { resendSeconds: number; perHour: number; validMinutes: number };
  retries: { afterHours: number[]; textOnTries: number[] };
  texts: Record<string, { en?: string; ka?: string }>;
  schedule: { renewalDays: number[]; endingDays: number[]; unpaidHours: number[]; cartHours: number[]; afterDeliveryHours: number };
  limits: { enabled: boolean; perDay: number; gapMinutes: number };
  textDefaults?: Record<string, { label: string; fillIns: string[]; en: string; ka: string }>;
};

/** Which wording each on/off message uses (a declined card has three, depending on what happens next). */
const WORDING: Record<string, string[]> = {
  ORDER_CUSTOMER: ['ORDER_CUSTOMER'], WELCOME: ['WELCOME'], PAYMENT_FAILED: ['RENEWAL_RETRY', 'RENEWAL_REFUSED', 'RENEWAL_ENDED'], PAYMENT_RECOVERED: ['PAYMENT_RECOVERED'], REFUND: ['REFUND'], EXTRA_CHARGE: ['EXTRA_CHARGE'],
  RENEWAL_SOON: ['RENEWAL_SOON_CARD', 'RENEWAL_SOON_PAY'], PLAN_ENDING: ['PLAN_ENDING'], UNPAID_ORDER: ['UNPAID_ORDER'], CART_REMINDER: ['CART_REMINDER'], SHIPPED: ['SHIPPED'], DELIVERED: ['DELIVERED'], AFTER_DELIVERY: ['AFTER_DELIVERY'],
};
const SAMPLE: Record<string, string> = { firstName: 'Nino', orderId: 'A1B2C3D4', items: '3 items', total: '₾99', amount: '₾89', nextTry: '23 Oct, 15:00', tries: '8', card: ' to your card ••1111', plan: '6-month plan', date: '5 November', what: 'order #A1B2C3D4', tracking: ' Tracking: GE123456', dog: 'Rex' };
const example = (s: S, key: string) => (WORDING[key] ?? []).map((k) => {
  const words = s.texts?.[k]?.en?.trim() || s.textDefaults?.[k]?.en || '';
  return words.replace(/\{\{(\w+)\}\}/g, (_, v) => SAMPLE[v] ?? '');
}).filter(Boolean);

const FILL: Record<string, string> = { firstName: 'first name', orderId: 'order number', items: 'number of items', total: 'total', amount: 'amount', nextTry: 'next try date', tries: 'number of tries', card: 'card ending', plan: 'plan name', date: 'date', what: 'order or box', tracking: 'tracking number', dog: 'dog’s name' };
/** How many texts one message costs: Georgian letters fit 70 to a text (67 when split), Latin 160 (153). */
function segments(text: string) {
  const unicode = /[^\x00-\x7F’—–…]/.test(text) || /[’—–…]/.test(text);
  const per = unicode ? 70 : 160, multi = unicode ? 67 : 153;
  return text.length <= per ? 1 : Math.ceil(text.length / multi);
}

const TOPICS: { key: Topic; label: string; hint: string }[] = [
  { key: 'orders', label: '🛍️ New orders', hint: 'Order number, total, customer, city, items' },
  { key: 'signups', label: '👋 New customers', hint: 'Name, phone and email' },
  { key: 'payments', label: '💳 Payment problems', hint: 'A renewal card was declined' },
];
const CUSTOMER: { key: string; label: string; example: string; group?: 'reminder' | 'delivery'; hint?: string }[] = [
  { key: 'ORDER_CUSTOMER', label: 'Order paid', example: 'PupBox: Thank you, Nino! Order #A1B2C3D4 is paid — 3 items, ₾99. We’ll let you know when it ships.' },
  { key: 'WELCOME', label: 'Welcome after sign-up', example: 'PupBox: Welcome, Nino! Your account is ready. Tell us about your dog and pick a box: pupbox.ge' },
  { key: 'PAYMENT_FAILED', label: 'Renewal card declined', example: 'PupBox: Your plan renewal (₾89) didn’t go through. We’ll try again 23 Oct, 15:00, or pay now: pupbox.ge/account/subscriptions' },
  { key: 'PAYMENT_RECOVERED', label: 'Renewal paid after a retry', example: 'PupBox: Payment received (₾89) — your plan continues. Thank you!' },
  { key: 'REFUND', label: 'Money refunded', example: 'PupBox: We’ve refunded ₾15 for order #A1B2C3D4 to your card ••1111. It can take 3–5 working days to show.' },
  { key: 'EXTRA_CHARGE', label: 'Extra payment for added items', example: 'PupBox: We added items to your order #A1B2C3D4 as you asked. Please pay the difference of ₾12 here: pupbox.ge/account/orders' },
  { key: 'SHIPPED', group: 'delivery', label: '🚚 On its way', example: 'PupBox: Your order #A1B2C3D4 is on its way! Tracking: GE123456', hint: 'When an order or monthly box is marked Shipped.' },
  { key: 'DELIVERED', group: 'delivery', label: '📦 Delivered', example: 'PupBox: Your order #A1B2C3D4 has been delivered. Enjoy!', hint: 'When it’s marked Delivered.' },
  { key: 'RENEWAL_SOON', group: 'reminder', label: '🔁 Renewal coming', example: 'PupBox: Nino, your 6-month plan renews on 5 November — we’ll charge ₾89 to your saved card.', hint: 'Days before a renewing plan’s date — see the schedule below.' },
  { key: 'PLAN_ENDING', group: 'reminder', label: '⏳ Plan ending', example: 'PupBox: Nino, your 6-month plan ends on 5 November. Want more boxes? Renew here: …', hint: 'For plans that don’t renew by themselves.' },
  { key: 'UNPAID_ORDER', group: 'reminder', label: '💳 Order not paid yet', example: 'PupBox: Nino, your order #A1B2C3D4 (₾99) isn’t paid yet. Finish it here: …', hint: 'Hours after an order was placed and not paid.' },
  { key: 'CART_REMINDER', group: 'reminder', label: '🛒 Items left in the basket', example: 'PupBox: Nino, you left 3 items in your basket. It’s waiting for you: pupbox.ge/cart', hint: 'An offer: only to customers who agreed to SMS offers.' },
  { key: 'AFTER_DELIVERY', group: 'reminder', label: '🐶 How did the dog like it?', example: 'PupBox: Nino, how did Rex like the box? Tell us — it helps us pick the next one.', hint: 'After a delivery; at most once a month per customer.' },
];
const KIND: Record<string, string> = {
  OTP: 'Code', WELCOME: 'Welcome', NEW_CUSTOMER_ADMIN: 'New customer → team', ORDER_CUSTOMER: 'Order → customer', ORDER_ADMIN: 'Order → team',
  PAYMENT_FAILED: 'Card declined → customer', PAYMENT_FAILED_ADMIN: 'Card declined → team', PAYMENT_RECOVERED: 'Renewal paid', REFUND: 'Refund', EXTRA_CHARGE: 'Extra payment', TEST: 'Test',
  RENEWAL_SOON: 'Renewal coming', PLAN_ENDING: 'Plan ending', UNPAID_ORDER: 'Not paid yet', CART_REMINDER: 'Basket reminder', SHIPPED: 'On its way', DELIVERED: 'Delivered', AFTER_DELIVERY: 'After delivery',
};
const STATUS_TONE: Record<string, [string, string]> = {
  SENT: ['var(--green-50)', 'var(--green-800)'], FAILED: ['var(--red-50)', 'var(--red-600)'], QUEUED: ['var(--amber-50)', 'var(--amber-700)'],
};

/** "3 h", "1 day", "9 days" */
const span = (h: number) => (h < 24 || h % 24 ? `${h} h` : `${h / 24} day${h === 24 ? '' : 's'}`);
/** Shown like 599 95 01 09 (Georgian mobiles); anything else as stored. */
const pretty = (p: string) => { const m = p.match(/^\+995(\d{3})(\d{2})(\d{2})(\d{2})$/); return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p; };
const validPhone = (p: string) => /^(\+?995)?5\d{8}$/.test(p.replace(/[\s()-]/g, '')) || /^\+\d{8,15}$/.test(p.replace(/[\s()-]/g, ''));

/**
 * Admin → Text messages: everything about SMS in one place.
 * Main switch · connection (Wifisher key + sender) · team numbers, each
 * choosing what it hears about · which customer messages go out · quiet
 * hours · code limits · when a declined renewal card is retried and which
 * tries text the customer · the latest messages. One Save for all of it.
 */
export default function SmsPage() {
  const [saved, setSaved] = useState<S | null>(null);
  const [s, setS] = useState<S | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState('');
  const [testTo, setTestTo] = useState('');

  const loadStatus = () => fetch(`${API}/admin/sms/status`, { headers: auth() }).then((r) => (r.ok ? r.json() : null)).then(setStatus).catch(() => setStatus(null));
  const loadLog = (st = logFilter) => fetch(`${API}/admin/sms/log?limit=30`, { headers: auth() }).then((r) => (r.ok ? r.json() : [])).then((d) => setLog(st ? d.filter((x: any) => x.status === st) : d)).catch(() => setLog([]));
  useEffect(() => {
    fetch(`${API}/admin/sms/settings`, { headers: auth() }).then((r) => r.json()).then((d) => { setSaved(d); setS(d); });
    loadStatus(); loadLog('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = useMemo(() => !!s && !!saved && (JSON.stringify(s) !== JSON.stringify(saved) || newKey !== null), [s, saved, newKey]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  if (!s) return <div style={{ padding: 28, color: 'var(--slate-400)' }}>Loading…</div>;
  const up = (f: (x: S) => S) => { setS((x) => (x ? f(structuredClone(x)) : x)); setMsg(null); };

  async function save() {
    const bad = s!.team.find((t) => !validPhone(t.phone));
    if (bad) { setMsg({ ok: false, text: `“${bad.phone || 'empty'}” isn’t a mobile number. Write it like 599 12 34 56.` }); return; }
    setSaving(true); setMsg(null);
    const body = { ...s, ...(newKey !== null ? { apiKey: newKey.trim() } : {}) };
    const r = await fetch(`${API}/admin/sms/settings`, { method: 'PUT', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setMsg({ ok: false, text: err(d, `Not saved (error ${r.status}).`) }); return; }
    setSaved(d); setS(d); setNewKey(null);
    setMsg({ ok: true, text: 'Saved — applies to the next message.' });
    loadStatus();
  }

  async function test(to: string) {
    setTesting(to); setMsg(null);
    const r = await fetch(`${API}/admin/sms/test`, { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ to }) });
    const d = await r.json().catch(() => ({}));
    setTesting('');
    setMsg(r.ok ? { ok: true, text: `Test sent to ${pretty(d.to)}.` } : { ok: false, text: err(d, 'Not sent.') });
    loadLog(); loadStatus();
  }

  const connected = status?.configured && !status?.error;
  const tries = s.retries.afterHours.length + 1;

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 28px)', maxWidth: 820, paddingBottom: 110 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>📱 Text messages</h1>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 20px' }}>Who gets which text, and when. Changes apply as soon as you save.</p>

      {/* Main switch + where things stand */}
      <section style={{ ...card, display: 'grid', gap: 12, background: s.enabled ? 'var(--teal-50)' : 'var(--slate-50)', borderColor: s.enabled ? 'var(--teal-200)' : 'var(--slate-200b)' }}>
        <Row title="Send text messages" hint={s.enabled ? 'Order, payment and welcome messages go out as set below.' : 'Off: no order, payment or welcome texts — to customers or the team. Sign-up codes still go.'}>
          <Switch on={s.enabled} label="Send text messages" onChange={(v) => up((x) => ({ ...x, enabled: v }))} />
        </Row>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Pill tone={connected ? 'ok' : 'warn'}>{!status ? 'Checking…' : connected ? '✓ Connected to Wifisher' : status.provider === 'none' ? 'Not connected yet — add the API key below' : 'Wifisher not answering'}</Pill>
          {status?.balance != null && <Pill tone={status.balance > 50 ? 'ok' : 'warn'}>{status.balance.toLocaleString()} messages left</Pill>}
          {status?.queued > 0 && <Pill tone="warn">{status.queued} waiting for the morning</Pill>}
        </div>
      </section>

      <Section title="Connection" hint="From your Wifisher account. The key is stored safely and only ever shown as its last 4 characters.">
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Sender name" hint="What phones show as the sender. Must be approved in Wifisher — up to 11 letters.">
            <input value={s.sender} maxLength={11} placeholder={status?.sender || 'pupbox'} onChange={(e) => up((x) => ({ ...x, sender: e.target.value }))} style={{ ...inp, maxWidth: 220 }} aria-label="Sender name" />
            {status?.senders?.length > 0 && !status.senders.includes(s.sender || status.sender) && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--red-600)' }}>Not in Wifisher’s approved list: {status.senders.join(', ')}</p>}
          </Field>
          <Field label="API key" hint={s.apiKey ? 'Saved here.' : status?.keyFrom === 'server' ? 'Using the key from the server settings (.env).' : 'Not added yet.'}>
            {newKey === null ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <code style={{ fontSize: 13, padding: '8px 12px', borderRadius: 10, background: 'var(--slate-100)', color: 'var(--slate-700)' }}>{s.apiKey || 'none'}</code>
                <button type="button" onClick={() => setNewKey('')} style={btnSoft}>{s.apiKey ? 'Replace key' : '+ Add key'}</button>
                {s.apiKey && <button type="button" onClick={() => { if (confirm('Remove the API key? Text messages stop until a new one is added.')) setNewKey(''); }} style={{ ...btnSoft, color: 'var(--red-600)' }}>Remove</button>}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input autoFocus type="password" autoComplete="off" value={newKey} onChange={(e) => { setNewKey(e.target.value); setMsg(null); }} placeholder="Paste the key from Wifisher" style={{ ...inp, flex: '1 1 240px' }} aria-label="New API key" />
                <button type="button" onClick={() => setNewKey(null)} style={btnSoft}>Keep the old one</button>
              </div>
            )}
          </Field>
          <Field label="Send a test" hint="Checks the key, sender and balance in one go.">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="599 12 34 56" inputMode="tel" aria-label="Number for a test message" style={{ ...inp, flex: '1 1 180px', maxWidth: 260 }} />
              <button type="button" disabled={!testTo.trim() || !!testing || dirty} title={dirty ? 'Save first' : undefined} onClick={() => test(testTo)} style={{ ...btnSoft, opacity: !testTo.trim() || dirty ? 0.5 : 1 }}>{testing && testing === testTo ? 'Sending…' : 'Send test'}</button>
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Team numbers" hint="Who at PupBox gets a text, and about what.">
        <div style={{ display: 'grid', gap: 10 }}>
          {s.team.length === 0 && <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-400)' }}>No numbers yet.</p>}
          {s.team.map((t, i) => {
            const bad = !!t.phone && !validPhone(t.phone);
            return (
              <div key={i} style={{ border: '1px solid var(--slate-200b)', borderRadius: 14, padding: 12, opacity: t.active ? 1 : 0.6, display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input value={t.name} onChange={(e) => up((x) => { x.team[i].name = e.target.value; return x; })} placeholder="Name (e.g. Tamuna)" aria-label="Name" style={{ ...inp, flex: '1 1 140px' }} />
                  <input value={pretty(t.phone)} onChange={(e) => up((x) => { x.team[i].phone = e.target.value; return x; })} placeholder="599 12 34 56" inputMode="tel" aria-label="Phone number"
                    style={{ ...inp, flex: '1 1 150px', borderColor: bad ? 'var(--red-400, #f87171)' : undefined }} />
                  <Switch small on={t.active} label={`Texts to ${t.name || pretty(t.phone)}`} onChange={(v) => up((x) => { x.team[i].active = v; return x; })} />
                </div>
                {bad && <p style={{ margin: 0, fontSize: 12, color: 'var(--red-600)' }}>Write it like 599 12 34 56.</p>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TOPICS.map((tp) => {
                    const on = t.topics.includes(tp.key);
                    return (
                      <button key={tp.key} type="button" role="checkbox" aria-checked={on} title={tp.hint}
                        onClick={() => up((x) => { const z = x.team[i]; z.topics = on ? z.topics.filter((k) => k !== tp.key) : [...z.topics, tp.key]; return x; })}
                        style={{ padding: '6px 11px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${on ? 'var(--teal-500)' : 'var(--slate-200)'}`, background: on ? 'var(--teal-50)' : 'var(--white)', color: on ? 'var(--teal-800)' : 'var(--slate-500)' }}>
                        {on ? '✓ ' : ''}{tp.label}
                      </button>
                    );
                  })}
                  <span style={{ flex: 1 }} />
                  <button type="button" onClick={() => test(t.phone)} disabled={!!testing || bad || dirty} title={dirty ? 'Save first' : 'Send a test message'} style={{ ...btnLink, opacity: bad || dirty ? 0.4 : 1 }}>{testing && testing === t.phone ? 'Sending…' : 'Test'}</button>
                  <button type="button" onClick={() => { if (confirm(`Remove ${t.name || pretty(t.phone)}?`)) up((x) => { x.team.splice(i, 1); return x; }); }} style={{ ...btnLink, color: 'var(--red-600)' }}>Remove</button>
                </div>
              </div>
            );
          })}
          <button type="button" onClick={() => up((x) => { x.team.push({ name: '', phone: '', active: true, topics: ['orders', 'signups', 'payments'] }); return x; })}
            style={{ padding: 12, borderRadius: 14, border: '2px dashed var(--slate-300)', background: 'var(--white)', color: 'var(--teal-700)', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>+ Add a number</button>
        </div>
      </Section>

      <Section title="Messages to customers" hint="Only to a confirmed phone number. Tap a message to see what it says.">
        <div style={{ display: 'grid', gap: 2 }}>
          <Row title="🔒 Verification codes" hint="Always on — sign-up and changing a number need them.">
            <Switch on disabled label="Verification codes" onChange={() => undefined} />
          </Row>
          {CUSTOMER.map((m, i) => (
            <div key={m.key}>
            {m.group !== CUSTOMER[i - 1]?.group && <div style={{ margin: '14px 0 2px', fontSize: 12, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-400)' }}>{m.group === 'delivery' ? 'Delivery updates' : 'Reminders — on a schedule'}</div>}
            <details style={{ borderTop: '1px solid var(--slate-100)' }}>
              <summary style={{ listStyle: 'none', cursor: 'pointer' }}>
                <Row title={m.label} hint={`${m.hint ? `${m.hint} ` : ''}Example ▾`}>
                  <span onClick={(e) => e.preventDefault()}><Switch on={s.customer[m.key]} label={m.label} onChange={(v) => up((x) => { x.customer[m.key] = v; return x; })} /></span>
                </Row>
              </summary>
              <p style={{ margin: '0 0 10px', padding: '10px 12px', borderRadius: 12, background: 'var(--slate-50)', fontSize: 12.5, color: 'var(--slate-600)', lineHeight: 1.5 }}>
                {(example(s, m.key).length ? example(s, m.key) : [m.example]).map((x, i) => <span key={i} style={{ display: 'block', marginBottom: 4 }}>{x}</span>)}
                <span style={{ color: 'var(--slate-400)' }}>Sent in Georgian or English, in the customer’s language. Change the words under Wording below.</span>
              </p>
            </details>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Wording" hint="What each text says, in Georgian and English. Fill-ins in {{curly brackets}} are put in for each customer. Longer texts cost more — Georgian fits 70 letters in one SMS.">
        <div style={{ display: 'grid', gap: 10 }}>
          {Object.entries(s.textDefaults ?? {}).map(([key, d]) => (
            <details key={key} style={{ border: '1px solid var(--slate-200b)', borderRadius: 12, padding: '10px 12px', background: 'var(--white)' }}>
              <summary style={{ cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: 'var(--slate-800)' }}>
                {d.label}{(s.texts?.[key]?.ka || s.texts?.[key]?.en) && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--teal-50)', borderRadius: 999, padding: '1px 7px' }}>edited</span>}
              </summary>
              {(['ka', 'en'] as const).map((l) => {
                const value = s.texts?.[key]?.[l] ?? d[l];
                const n = segments(value);
                return (
                  <div key={l} style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate-500)', marginBottom: 4 }}>
                      <b>{l === 'ka' ? '🇬🇪 Georgian' : '🇬🇧 English'}</b>
                      <span style={{ color: n > 2 ? 'var(--amber-700)' : 'var(--slate-400)' }}>{value.length} characters · {n} SMS</span>
                    </div>
                    <textarea value={value} rows={3} maxLength={480} aria-label={`${d.label} — ${l === 'ka' ? 'Georgian' : 'English'}`}
                      onChange={(e) => up((x) => { x.texts = x.texts ?? {}; x.texts[key] = { ...(x.texts[key] ?? {}), [l]: e.target.value }; return x; })}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 10, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: 'var(--white)', color: 'var(--slate-900)' }} />
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, color: 'var(--slate-400)' }}>Fill-ins: {d.fillIns.map((f) => `{{${f}}} = ${FILL[f] ?? f}`).join(' · ')}</span>
                {(s.texts?.[key]?.ka || s.texts?.[key]?.en) && <button type="button" onClick={() => up((x) => { delete x.texts[key]; return x; })} style={{ border: 'none', background: 'none', color: 'var(--teal-600)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>↺ Original words</button>}
              </div>
            </details>
          ))}
        </div>
      </Section>

      <Section title="Reminder schedule" hint="When each reminder goes. Add or remove steps; only the latest step that’s due is sent, and each goes once.">
        <div style={{ display: 'grid', gap: 10 }}>
          <Ladder title="🔁 Renewal coming" off={!s.customer.RENEWAL_SOON} unit="day" words="before the renewal date" values={s.schedule.renewalDays} max={60} count={6}
            onChange={(v) => up((x) => { x.schedule.renewalDays = v; return x; })} />
          <Ladder title="⏳ Plan ending" off={!s.customer.PLAN_ENDING} unit="day" words="before the plan ends" values={s.schedule.endingDays} max={60} count={6}
            onChange={(v) => up((x) => { x.schedule.endingDays = v; return x; })} />
          <Ladder title="💳 Order not paid yet" off={!s.customer.UNPAID_ORDER} unit="hour" words="after the order was placed" values={s.schedule.unpaidHours} max={720} count={5}
            onChange={(v) => up((x) => { x.schedule.unpaidHours = v; return x; })} />
          <Ladder title="🛒 Items left in the basket" off={!s.customer.CART_REMINDER} unit="hour" words="after the basket was last changed" values={s.schedule.cartHours} max={720} count={5}
            onChange={(v) => up((x) => { x.schedule.cartHours = v; return x; })} />
          <Ladder title="🐶 How did the dog like it?" off={!s.customer.AFTER_DELIVERY} unit="hour" words="after delivery" values={[s.schedule.afterDeliveryHours]} max={720} count={1}
            onChange={(v) => up((x) => { x.schedule.afterDeliveryHours = v[0] ?? 72; return x; })} />
        </div>
      </Section>

      <Section title="Limits" hint="So nobody gets too many texts. Applies to reminders only — codes, order, payment and delivery texts always go. A reminder over the limit waits; it isn’t lost.">
        <div style={{ display: 'grid', gap: 12 }}>
          <Row title="Limit reminders per customer" hint={s.limits.enabled ? `At most ${s.limits.perDay} a day, at least ${span(Math.max(1, Math.round(s.limits.gapMinutes / 60)))}${s.limits.gapMinutes % 60 ? ` (${s.limits.gapMinutes} min)` : ''} apart.` : 'Off: reminders go as soon as they’re due.'}>
            <Switch on={s.limits.enabled} label="Limit reminders" onChange={(v) => up((x) => { x.limits.enabled = v; return x; })} />
          </Row>
          <div style={{ display: 'grid', gap: 10, opacity: s.limits.enabled ? 1 : 0.5 }}>
            <Num label="At most" unit="reminders per customer a day" min={1} max={10} value={s.limits.perDay} onChange={(v) => up((x) => { x.limits.perDay = v; return x; })} />
            <Num label="At least" unit="minutes between two reminders" min={0} max={1440} value={s.limits.gapMinutes} onChange={(v) => up((x) => { x.limits.gapMinutes = v; return x; })} />
          </div>
        </div>
      </Section>

      <Section title="Quiet hours" hint="Customer messages that arrive at night wait until the morning. Codes always go straight away.">
        <div style={{ display: 'grid', gap: 12 }}>
          <Row title="Hold messages at night" hint={s.quiet.enabled ? `From ${s.quiet.from} to ${s.quiet.to} (Tbilisi time).` : 'Off: messages go at any hour.'}>
            <Switch on={s.quiet.enabled} label="Quiet hours" onChange={(v) => up((x) => { x.quiet.enabled = v; return x; })} />
          </Row>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', opacity: s.quiet.enabled ? 1 : 0.5 }}>
            <label style={lbl}>From <TimeInput value={s.quiet.from} disabled={!s.quiet.enabled} onChange={(e) => up((x) => { x.quiet.from = e.target.value; return x; })} style={{ ...inp, width: 'auto' }} /></label>
            <label style={lbl}>to <TimeInput value={s.quiet.to} disabled={!s.quiet.enabled} onChange={(e) => up((x) => { x.quiet.to = e.target.value; return x; })} style={{ ...inp, width: 'auto' }} /></label>
            <label style={{ ...lbl, fontWeight: 500 }}><input type="checkbox" checked={s.quiet.team} disabled={!s.quiet.enabled} onChange={(e) => up((x) => { x.quiet.team = e.target.checked; return x; })} /> Team texts wait too</label>
          </div>
        </div>
      </Section>

      <Section title="Verification codes" hint="Limits that keep codes from being abused (each one costs a message).">
        <div style={{ display: 'grid', gap: 10 }}>
          <Num label="Wait between codes" unit="seconds" min={30} max={600} value={s.codes.resendSeconds} onChange={(v) => up((x) => { x.codes.resendSeconds = v; return x; })} />
          <Num label="At most" unit="codes per number per hour" min={1} max={20} value={s.codes.perHour} onChange={(v) => up((x) => { x.codes.perHour = v; return x; })} />
          <Num label="A code works for" unit="minutes" min={2} max={60} value={s.codes.validMinutes} onChange={(v) => up((x) => { x.codes.validMinutes = v; return x; })} />
        </div>
      </Section>

      <Section title="When a renewal card is declined" hint="We charge the saved card again on this schedule, counted from the first try. A card that’s blocked or expired isn’t retried. After the last try the plan ends.">
        <div style={{ display: 'grid', gap: 8 }}>
          {Array.from({ length: tries }, (_, k) => {
            const n = k + 1, h = k === 0 ? 0 : s.retries.afterHours[k - 1];
            const texted = s.retries.textOnTries.includes(n);
            const unit = k > 0 && h % 24 === 0 ? 'days' : 'hours';
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 12, background: 'var(--slate-50)' }}>
                <strong style={{ width: 56, fontSize: 13, color: 'var(--slate-800)' }}>Try {n}</strong>
                {k === 0 ? <span style={{ fontSize: 13, color: 'var(--slate-600)', flex: '1 1 160px' }}>on the renewal date</span> : (
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flex: '1 1 160px', fontSize: 13, color: 'var(--slate-600)' }}>
                    <NumInput min={1} value={unit === 'days' ? h / 24 : h} aria-label={`Try ${n} after`}
                      onChange={(e) => up((x) => { x.retries.afterHours[k - 1] = Math.max(1, Math.round(Number(e.target.value) || 1)) * (unit === 'days' ? 24 : 1); return x; })} style={{ ...inp, width: 70 }} />
                    <Dropdown aria-label={`Try ${n} unit`} value={unit} onChange={(u) => up((x) => { const v = x.retries.afterHours[k - 1]; x.retries.afterHours[k - 1] = u === 'days' ? Math.max(1, Math.round(v / 24)) * 24 : v; return x; })}
                      options={[{ value: 'hours', label: 'hours' }, { value: 'days', label: 'days' }]} />
                    after try 1
                  </span>
                )}
                <label style={{ ...lbl, fontWeight: 600 }}>
                  <input type="checkbox" checked={texted} onChange={(e) => up((x) => { x.retries.textOnTries = e.target.checked ? [...x.retries.textOnTries, n].sort((a, b) => a - b) : x.retries.textOnTries.filter((t) => t !== n); return x; })} /> Text the customer
                </label>
                {k > 0 && <button type="button" aria-label={`Remove try ${n}`} onClick={() => up((x) => { x.retries.afterHours.splice(k - 1, 1); x.retries.textOnTries = x.retries.textOnTries.filter((t) => t !== n).map((t) => (t > n ? t - 1 : t)); return x; })} style={{ ...btnLink, color: 'var(--red-600)' }}>✕</button>}
              </div>
            );
          })}
          {tries < 13 && <button type="button" onClick={() => up((x) => { const last = x.retries.afterHours.at(-1) ?? 0; x.retries.afterHours.push(last + 168); return x; })} style={{ ...btnSoft, justifySelf: 'start' }}>+ Add a try</button>}
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--slate-500)' }}>
            {tries} tries over {span(s.retries.afterHours.at(-1) ?? 0)} · the customer gets {s.retries.textOnTries.length} text{s.retries.textOnTries.length === 1 ? '' : 's'} · the team hears about the first and last.
          </p>
        </div>
      </Section>

      <Section title="Latest messages" hint="Codes are hidden. Messages held for quiet hours show as Waiting.">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <Dropdown aria-label="Show" value={logFilter} onChange={(v) => { setLogFilter(v); loadLog(v); }}
            options={[{ value: '', label: 'All messages' }, { value: 'SENT', label: 'Sent' }, { value: 'QUEUED', label: 'Waiting' }, { value: 'FAILED', label: 'Failed' }, { value: 'SKIPPED', label: 'Not sent' }]} />
          <button type="button" onClick={() => loadLog()} style={btnSoft}>↻ Refresh</button>
        </div>
        {log.length === 0 ? <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-400)' }}>Nothing here.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {log.map((l) => {
              const [bg, fg] = STATUS_TONE[l.status] ?? ['var(--slate-100)', 'var(--slate-500)'];
              return (
                <div key={l.id} style={{ display: 'flex', flexWrap: 'nowrap', gap: 10, alignItems: 'flex-start', fontSize: 12.5, padding: '8px 10px', borderRadius: 10, background: 'var(--slate-50)' }}>
                  <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: bg, color: fg }}>{l.status === 'QUEUED' ? 'WAITING' : l.status === 'SKIPPED' ? 'NOT SENT' : l.status}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ color: 'var(--slate-800)' }}>{KIND[l.kind] ?? l.kind}</strong> <span style={{ color: 'var(--slate-500)' }}>→ {pretty(l.to)}</span>
                    <span style={{ display: 'block', color: 'var(--slate-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.text}</span>
                    {l.status === 'QUEUED' && l.sendAt && <span style={{ display: 'block', color: 'var(--amber-700)' }}>Goes at {new Date(l.sendAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                    {l.error && <span style={{ display: 'block', color: 'var(--red-600)' }}>{l.error}</span>}
                  </span>
                  <span style={{ flexShrink: 0, color: 'var(--slate-400)', fontSize: 11.5 }}>{new Date(l.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Save bar */}
      <div style={{ position: 'sticky', bottom: 12, zIndex: 5, marginTop: 16, padding: 12, borderRadius: 16, background: 'var(--white)', border: '1px solid var(--slate-200b)', boxShadow: '0 -8px 24px -16px rgba(15,23,42,.35)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span role="status" style={{ flex: '1 1 180px', fontSize: 13, fontWeight: 600, color: msg ? (msg.ok ? 'var(--teal-700)' : 'var(--red-600)') : dirty ? 'var(--amber-700)' : 'var(--slate-400)' }}>
          {msg?.text ?? (dirty ? 'Unsaved changes' : 'All saved')}
        </span>
        {dirty && <button type="button" onClick={() => { if (confirm('Discard your changes?')) { setS(saved); setNewKey(null); setMsg(null); } }} style={btnSoft}>Discard</button>}
        <button type="button" onClick={save} disabled={!dirty || saving} style={{ padding: '10px 18px', borderRadius: 11, border: 'none', background: 'var(--teal-600)', color: 'var(--white)', fontSize: 13.5, fontWeight: 800, cursor: dirty ? 'pointer' : 'default', opacity: dirty && !saving ? 1 : 0.5 }}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section style={{ ...card, marginTop: 14 }}>
      <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: 'var(--slate-900)' }}>{title}</h2>
      <p style={{ margin: '3px 0 14px', fontSize: 12.5, color: 'var(--slate-500)', lineHeight: 1.5 }}>{hint}</p>
      {children}
    </section>
  );
}
function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-800)' }}>{title}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 1 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-700)' }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--slate-500)', margin: '1px 0 6px' }}>{hint}</div>}
      {children}
    </div>
  );
}
function Switch({ on, onChange, label, disabled, small }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; small?: boolean }) {
  const w = small ? 38 : 46, h = small ? 22 : 26;
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      style={{ flexShrink: 0, width: w, height: h, borderRadius: 99, border: 'none', padding: 3, cursor: disabled ? 'default' : 'pointer', background: on ? 'var(--teal-600)' : 'var(--slate-300)', opacity: disabled ? 0.55 : 1, transition: 'background .15s', display: 'inline-flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
      <span style={{ width: h - 6, height: h - 6, borderRadius: 99, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
    </button>
  );
}
/** A list of "N days before" / "N hours after" steps, like the renewal retries: add, change, remove. */
function Ladder({ title, off, unit, words, values, max, count, onChange }: { title: string; off: boolean; unit: 'day' | 'hour'; words: string; values: number[]; max: number; count: number; onChange: (v: number[]) => void }) {
  const tidy = (v: number[]) => [...new Set(v.filter((n) => n >= 1 && n <= max))].sort((a, b) => (unit === 'day' ? b - a : a - b));
  return (
    <div style={{ border: '1px solid var(--slate-200b)', borderRadius: 14, padding: 12, display: 'grid', gap: 8, opacity: off ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13.5, color: 'var(--slate-800)', flex: '1 1 auto' }}>{title}</strong>
        {off && <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate-500)', background: 'var(--slate-100)', borderRadius: 99, padding: '2px 8px' }}>Message is off above</span>}
      </div>
      {values.map((v, i) => {
        const days = unit === 'hour' && v % 24 === 0;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: 'var(--slate-600)' }}>
            <NumInput min={1} value={unit === 'day' ? v : days ? v / 24 : v} aria-label={`${title} step ${i + 1}`} style={{ ...inp, width: 70, flex: '0 0 70px' }}
              onBlur={() => onChange(tidy(values))}
              onChange={(e) => { const n = Math.max(1, Math.round(Number(e.target.value) || 1)); const next = [...values]; next[i] = unit === 'day' ? n : days ? n * 24 : n; onChange(next); }} />
            {unit === 'day' ? <span>{v === 1 ? 'day' : 'days'}</span> : (
              <Dropdown aria-label={`${title} step ${i + 1} unit`} value={days ? 'days' : 'hours'} options={[{ value: 'hours', label: 'hours' }, { value: 'days', label: 'days' }]}
                onChange={(u) => { const next = [...values]; next[i] = u === 'days' ? Math.max(1, Math.round(v / 24)) * 24 : v; onChange(next); }} />
            )}
            <span style={{ flex: '1 1 auto' }}>{words}</span>
            {count > 1 && values.length > 1 && <button type="button" aria-label={`Remove step ${i + 1}`} onClick={() => onChange(values.filter((_, k) => k !== i))} style={{ ...btnLink, color: 'var(--red-600)' }}>✕</button>}
          </div>
        );
      })}
      {count > 1 && values.length < count && (
        <button type="button" style={{ ...btnSoft, justifySelf: 'start', padding: '6px 11px', fontSize: 12.5 }}
          onClick={() => { const free = (unit === 'day' ? [3, 14, 1, 2, 30, 5, 10, 21] : [24, 72, 6, 3, 12, 48, 168, 1]).find((n) => !values.includes(n)); if (free) onChange(tidy([...values, free])); }}>+ Add a step</button>
      )}
    </div>
  );
}
function Pill({ tone, children }: { tone: 'ok' | 'warn'; children: ReactNode }) {
  return <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: tone === 'ok' ? 'var(--green-50)' : 'var(--amber-50)', color: tone === 'ok' ? 'var(--green-800)' : 'var(--amber-700)' }}>{children}</span>;
}
function Num({ label, unit, value, min, max, onChange }: { label: string; unit: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const bad = !(value >= min && value <= max);
  return (
    <label style={{ ...lbl, flexWrap: 'wrap' }}>
      {label}
      <NumInput min={min} max={max} value={Number.isFinite(value) ? value : ''} onChange={(e) => onChange(Math.round(Number(e.target.value)))} style={{ ...inp, width: 80, borderColor: bad ? 'var(--red-400, #f87171)' : undefined }} />
      {unit}{bad && <span style={{ color: 'var(--red-600)', fontSize: 12 }}>({min}–{max})</span>}
    </label>
  );
}

const card: CSSProperties = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 18, padding: 18 };
const inp: CSSProperties = { border: '1.5px solid var(--slate-200)', borderRadius: 10, padding: '8px 11px', fontSize: 14, background: 'var(--white)', color: 'var(--slate-900)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', minWidth: 0 };
const lbl: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--slate-700)', cursor: 'pointer' };
const btnSoft: CSSProperties = { padding: '8px 13px', borderRadius: 10, border: '1.5px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-700)', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnLink: CSSProperties = { border: 'none', background: 'none', color: 'var(--teal-700)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', padding: '6px 4px' };
