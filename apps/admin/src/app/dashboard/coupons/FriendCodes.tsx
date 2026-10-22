'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { NumInput } from '@/components/NumberField';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}`, 'Content-Type': 'application/json' });
const gel = (n: number) => `₾${Number(n || 0).toFixed(2).replace(/\.00$/, '')}`;

type Offer = { enabled: boolean; friendType: 'PERCENTAGE' | 'FIXED'; friendValue: number; appliesTo: string[]; minOrder: number; inviterReward: number };
const SCOPES = [
  { key: 'BOX', label: '📦 Box plans' },
  { key: 'SHOP', label: '🛍️ Shop products' },
  { key: 'CUSTOM_BOX', label: '🧩 Built boxes' },
  { key: 'GIFT', label: '🎁 Gifts' },
];

/**
 * Every customer has a referral code (NINO-4K7P) in their link. A friend who
 * opens the link gets it applied in their basket by itself, or can type it
 * in the promo box, for a discount on their FIRST order. When that order
 * sticks, the customer who shared it gets a promo code. All of it is set here.
 */
export default function FriendCodes() {
  const [saved, setSaved] = useState<Offer | null>(null);
  const [o, setO] = useState<Offer | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/referrals/admin/offer`, { headers: auth() }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setSaved(d.offer); setO(d.offer); setStats(d.stats); } });
  }, []);
  if (!o || !saved) return null;
  const dirty = JSON.stringify(o) !== JSON.stringify(saved);
  const up = (p: Partial<Offer>) => { setO({ ...o, ...p }); setMsg(null); };
  const off = o.friendType === 'PERCENTAGE' ? `${o.friendValue}%` : gel(o.friendValue);
  const bad = !(o.friendValue > 0) || (o.friendType === 'PERCENTAGE' && o.friendValue > 90) || o.appliesTo.length === 0;

  async function save() {
    setBusy(true); setMsg(null);
    const r = await fetch(`${API}/referrals/admin/offer`, { method: 'PUT', headers: auth(), body: JSON.stringify(o) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: (Array.isArray(d.message) ? d.message[0] : d.message) || 'Not saved.' }); return; }
    setSaved(d.offer); setO(d.offer); setStats(d.stats);
    setMsg({ ok: true, text: 'Saved — applies to the next basket.' });
  }

  return (
    <section style={{ ...card, borderColor: o.enabled ? 'var(--teal-200)' : 'var(--slate-200b)', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 26 }} aria-hidden="true">🤝</span>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: 'var(--slate-900)' }}>Friend codes <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99, marginLeft: 4, background: saved.enabled ? 'var(--green-50)' : 'var(--slate-100)', color: saved.enabled ? 'var(--green-800)' : 'var(--slate-500)' }}>{saved.enabled ? 'ON' : 'OFF'}</span></h2>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--slate-500)' }}>
            Each customer’s code (e.g. NINO-4K7P) is in their share link. The friend gets <strong>{saved.friendType === 'PERCENTAGE' ? `${saved.friendValue}%` : gel(saved.friendValue)} off their first order</strong>; the customer gets a <strong>{gel(saved.inviterReward)} promo code</strong> once it’s paid and kept.
          </p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} style={btnSoft}>{open ? 'Close' : 'Change'}</button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))', gap: 8, marginTop: 14 }}>
          <Stat k="Orders with a friend code" v={stats.ordersWithCode} />
          <Stat k="Paid" v={stats.paidOrders} />
          <Stat k="Friends saved" v={gel(stats.friendDiscounts)} />
          <Stat k="Rewards given" v={`${stats.rewardsGiven} · ${gel(stats.rewardsValue)}`} />
        </div>
      )}

      {open && (
        <div style={{ display: 'grid', gap: 16, marginTop: 18, paddingTop: 16, borderTop: '1px dashed var(--slate-200)' }}>
          <label style={{ ...row, cursor: 'pointer' }}>
            <input type="checkbox" checked={o.enabled} onChange={(e) => up({ enabled: e.target.checked })} />
            <span><strong>Friend codes work</strong><br /><span style={hint}>Off: codes can’t be applied; the share link still works for sign-ups.</span></span>
          </label>

          <div style={{ opacity: o.enabled ? 1 : 0.5, display: 'grid', gap: 16 }}>
            <div>
              <div style={lbl}>What the friend gets on their first order</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div role="radiogroup" aria-label="Discount type" style={{ display: 'inline-flex', padding: 3, borderRadius: 11, background: 'var(--slate-100)' }}>
                  {(['PERCENTAGE', 'FIXED'] as const).map((t) => (
                    <button key={t} type="button" role="radio" aria-checked={o.friendType === t} onClick={() => up({ friendType: t })}
                      style={{ padding: '6px 14px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', background: o.friendType === t ? 'var(--white)' : 'transparent', color: o.friendType === t ? 'var(--slate-900)' : 'var(--slate-500)' }}>{t === 'PERCENTAGE' ? '%' : '₾'}</button>
                  ))}
                </div>
                <NumInput min={1} max={o.friendType === 'PERCENTAGE' ? 90 : 1000} value={o.friendValue} aria-label="Discount amount" onChange={(e) => up({ friendValue: Number(e.target.value) })} style={{ ...inp, width: 90 }} />
                <span style={hint}>{o.friendType === 'PERCENTAGE' ? '% off (1–90)' : '₾ off'}</span>
              </div>
            </div>

            <div>
              <div style={lbl}>On which parts of the order</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SCOPES.map((s) => {
                  const on = o.appliesTo.includes(s.key);
                  return (
                    <button key={s.key} type="button" role="checkbox" aria-checked={on} onClick={() => up({ appliesTo: on ? o.appliesTo.filter((x) => x !== s.key) : [...o.appliesTo, s.key] })}
                      style={{ padding: '7px 12px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${on ? 'var(--teal-500)' : 'var(--slate-200)'}`, background: on ? 'var(--teal-50)' : 'var(--white)', color: on ? 'var(--teal-800)' : 'var(--slate-500)' }}>
                      {on ? '✓ ' : ''}{s.label}
                    </button>
                  );
                })}
              </div>
              {o.appliesTo.length === 0 && <p style={{ ...hint, color: 'var(--red-600)', margin: '6px 0 0' }}>Choose at least one.</p>}
            </div>

            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={lbl}>Minimum order (₾)</span>
                <NumInput min={0} value={o.minOrder} onChange={(e) => up({ minOrder: Number(e.target.value) })} style={{ ...inp, width: 110 }} />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={lbl}>The customer who shared gets (₾ promo code)</span>
                <NumInput min={0} value={o.inviterReward} onChange={(e) => up({ inviterReward: Number(e.target.value) })} style={{ ...inp, width: 110 }} />
              </label>
            </div>

            <p style={{ margin: 0, padding: '10px 12px', borderRadius: 12, background: 'var(--slate-50)', fontSize: 12.5, color: 'var(--slate-600)', lineHeight: 1.5 }}>
              <strong>In short:</strong> a new customer opens a friend’s link (or types their code) → {off} off {o.appliesTo.length === SCOPES.length ? 'their whole first order' : `the ${SCOPES.filter((s) => o.appliesTo.includes(s.key)).map((s) => s.label.slice(3).toLowerCase()).join(', ')} in their first order`}{o.minOrder > 0 ? ` of ${gel(o.minOrder)} or more` : ''}. One code per order (not with a promo code). Once it’s paid and past the free-cancel window, the friend who shared gets a {gel(o.inviterReward)} promo code by email.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span role="status" style={{ flex: '1 1 160px', fontSize: 13, fontWeight: 600, color: msg ? (msg.ok ? 'var(--teal-700)' : 'var(--red-600)') : dirty ? 'var(--amber-700)' : 'var(--slate-400)' }}>{msg?.text ?? (dirty ? 'Unsaved changes' : 'All saved')}</span>
            {dirty && <button type="button" onClick={() => { setO(saved); setMsg(null); }} style={btnSoft}>Discard</button>}
            <button type="button" onClick={save} disabled={!dirty || busy || bad} style={{ padding: '9px 18px', borderRadius: 11, border: 'none', background: 'var(--teal-600)', color: 'var(--white)', fontSize: 13.5, fontWeight: 800, cursor: dirty && !bad ? 'pointer' : 'default', opacity: dirty && !busy && !bad ? 1 : 0.5 }}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ k, v }: { k: string; v: any }) {
  return <div style={{ padding: '9px 12px', borderRadius: 12, background: 'var(--slate-50)' }}><div style={{ fontSize: 11.5, color: 'var(--slate-500)', fontWeight: 600 }}>{k}</div><div style={{ fontSize: 16, fontWeight: 800, color: 'var(--slate-900)' }}>{v}</div></div>;
}

const card: CSSProperties = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 18, padding: 18 };
const inp: CSSProperties = { border: '1.5px solid var(--slate-200)', borderRadius: 10, padding: '8px 11px', fontSize: 14, background: 'var(--white)', color: 'var(--slate-900)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
const lbl: CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--slate-700)', marginBottom: 6 };
const hint: CSSProperties = { fontSize: 12, color: 'var(--slate-500)' };
const row: CSSProperties = { display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: 'var(--slate-800)' };
const btnSoft: CSSProperties = { padding: '8px 13px', borderRadius: 10, border: '1.5px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-700)', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
