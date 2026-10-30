'use client';
import { Select } from '@/components/Dropdown';
import MapLink from '@/components/MapLink';
import { useState, useEffect, useRef } from 'react';
import { ALLERGENS } from '@pupbox/content';
import { api, getOr, patch, post } from '@/lib/api';

const STATUS_COLORS: Record<string, { background: string; color: string; border: string }> = {
  ACTIVE:         { background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' },
  PENDING:        { background: 'var(--amber-50)', color: 'var(--amber-700)', border: '1px solid var(--amber-200)' },
  PAUSED:         { background: 'var(--blue-50)', color: 'var(--blue-700)', border: '1px solid var(--blue-200)' },
  CANCELLED:      { background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)' },
  EXPIRED:        { background: 'var(--slate-50)', color: 'var(--slate-500)', border: '1px solid var(--slate-200)' },
  PAYMENT_FAILED: { background: 'var(--red-50)', color: 'var(--red-800)', border: '1px solid var(--red-200)' },
};

// ── Confirm modal ──────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'relative', background: 'var(--white)', borderRadius: 16, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--slate-200b)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--slate-900)' }}>{title}</h3>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-500)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            No, keep it
          </button>
          <button onClick={onConfirm} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: confirmColor, color: 'var(--white)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail modal ───────────────────────────────────────────────────────────
const SIZES = ['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '7px 10px', fontSize: 13, background: 'var(--white)', color: 'var(--slate-900)' };
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--teal-600)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 };

/** Edits the dog on the customer's behalf — e.g. they called about a new allergy. */
function DogEditor({ sub, onSaved, onDone }: { sub: any; onSaved: () => void; onDone: () => void }) {
  const d = sub.dog ?? {};
  const [v, setV] = useState({ name: d.name ?? '', size: d.size ?? '', allergies: (d.allergies ?? []) as string[], specialNotes: d.specialNotes ?? '' });
  const [other, setOther] = useState('');
  const [err, setErr] = useState('');
  const has = (k: string) => v.allergies.some(a => a.toLowerCase() === k.toLowerCase());
  const toggle = (k: string) => setV(x => ({ ...x, allergies: has(k) ? x.allergies.filter(a => a.toLowerCase() !== k.toLowerCase()) : [...x.allergies, k] }));
  async function save() {
    if (!v.name.trim()) return setErr('The dog needs a name.');
    try { await patch(`/admin/subscriptions/${sub.id}/dog`, { name: v.name, size: v.size, allergies: v.allergies, specialNotes: v.specialNotes }, 'Not saved.'); }
    catch (e: any) { return setErr(e.message); }
    onSaved(); onDone();
  }
  const custom = v.allergies.filter(a => !ALLERGENS.some(x => x.key.toLowerCase() === a.toLowerCase()));
  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} placeholder="Name" style={field} />
        <Select value={v.size} onChange={e => setV({ ...v, size: e.target.value })} style={field}>
          <option value="">Size not given</option>
          {SIZES.map(z => <option key={z} value={z}>{z.replace('_', ' ').toLowerCase()}</option>)}
        </Select>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {[...ALLERGENS.map(a => a.key as string), ...custom].map(k => (
          <button key={k} type="button" onClick={() => toggle(k)} style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: has(k) ? '1px solid var(--red-300)' : '1px solid var(--slate-200)', background: has(k) ? 'var(--red-50)' : 'var(--white)', color: has(k) ? 'var(--red-700)' : 'var(--slate-600)' }}>{k}</button>
        ))}
        <input value={other} onChange={e => setOther(e.target.value)} placeholder="+ other allergy"
          onKeyDown={e => { if (e.key === 'Enter' && other.trim()) { e.preventDefault(); if (!has(other.trim())) setV(x => ({ ...x, allergies: [...x.allergies, other.trim()] })); setOther(''); } }}
          style={{ ...field, width: 130, padding: '4px 10px' }} />
      </div>
      <textarea value={v.specialNotes} onChange={e => setV({ ...v, specialNotes: e.target.value })} rows={2} placeholder="Notes for packing" style={{ ...field, resize: 'vertical' }} />
      {err && <p style={{ margin: 0, fontSize: 12, color: 'var(--red-600)' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} style={actionBtn('var(--teal-600)')}>Save dog</button>
        <button onClick={onDone} style={{ ...actionBtn('var(--white)'), color: 'var(--slate-600)', border: '1px solid var(--slate-200)' }}>Cancel</button>
      </div>
    </div>
  );
}

/** Changes where the boxes go, on the customer's behalf. Boxes not yet packed follow. */
function AddressEditor({ sub, onSaved, onDone }: { sub: any; onSaved: () => void; onDone: () => void }) {
  const a = sub.address ?? {};
  const [v, setV] = useState({ firstName: a.firstName ?? '', lastName: a.lastName ?? '', phone: a.phone ?? '', city: a.city ?? '', addressLine1: a.addressLine1 ?? '', addressLine2: a.addressLine2 ?? '' });
  const [err, setErr] = useState('');
  async function save() {
    let r;
    try { r = await patch(`/admin/subscriptions/${sub.id}/address`, { ...v, addressLine2: v.addressLine2 || undefined }, 'Not saved.'); }
    catch (e: any) { return setErr(Array.isArray(e.body?.message) ? 'Check: name, a valid phone, city and street are all needed.' : e.message); }
    if (r.alreadyPacked) alert('Saved. This month’s box was already packed with the old address — relabel it by hand.');
    onSaved(); onDone();
  }
  const f = (k: keyof typeof v, ph: string, span = 1) => <input value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} placeholder={ph} style={{ ...field, gridColumn: `span ${span}` }} />;
  return (
    <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {f('firstName', 'First name')}{f('lastName', 'Last name')}{f('phone', 'Phone')}{f('city', 'City')}{f('addressLine1', 'Street, building', 2)}{f('addressLine2', 'Apartment, floor (optional)', 2)}
      {err && <p style={{ margin: 0, fontSize: 12, color: 'var(--red-600)', gridColumn: 'span 2' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, gridColumn: 'span 2' }}>
        <button onClick={save} style={actionBtn('var(--teal-600)')}>Save address</button>
        <button onClick={onDone} style={{ ...actionBtn('var(--white)'), color: 'var(--slate-600)', border: '1px solid var(--slate-200)' }}>Cancel</button>
      </div>
    </div>
  );
}

function DetailModal({ sub, onClose, onCancel, onResume, onSaved }: {
  sub: any;
  onClose: () => void;
  onCancel: (sub: any) => void;
  onResume: (sub: any) => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState<'dog' | 'address' | null>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const sc = STATUS_COLORS[sub.status] || STATUS_COLORS.EXPIRED;
  const day = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const ended = ['CANCELLED', 'EXPIRED'].includes(sub.status);
  const sectionHead = (title: string, key: 'dog' | 'address', canEdit: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 8px' }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
      {canEdit && editing !== key && <button onClick={() => setEditing(key)} style={linkBtn}>Edit</button>}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'relative', background: 'var(--white)', borderRadius: 20, width: 560, maxWidth: 'calc(100vw - 32px)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', border: '1px solid var(--slate-200b)' }}>
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--slate-900)' }}>{sub.user?.firstName} {sub.user?.lastName}</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--slate-400)' }}>{sub.user?.email}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ ...sc, display: 'inline-flex', alignItems: 'center', padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{sub.status}</span>
            <button onClick={onClose} aria-label="Close" style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200b)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)', fontSize: 18 }}>×</button>
          </div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {sub.cancelledAt && !ended && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--amber-800)', background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 10, padding: '10px 14px' }}>
              Cancelled on {day(sub.cancelledAt)} — this month’s box is the last; the plan ends {day(sub.endDate)}.
            </p>
          )}
          <Section title="Plan">
            <Row label="Name" value={sub.plan?.name || '—'} />
            <Row label="Price" value={`₾${Number(sub.plan?.price ?? 0).toFixed(2)}`} />
            <Row label="Length" value={sub.plan?.durationValue ? `${sub.plan.durationValue} ${String(sub.plan.durationUnit).toLowerCase()}${sub.plan.durationValue > 1 ? 's' : ''}` : '—'} />
            <Row label="Boxes" value={`${sub.boxesDelivered ?? 0} of ${sub.boxesTotal ?? 0} sent`} />
            <Row label="Renews" value={sub.autoRenewal ? 'Yes — payment link before it ends' : 'No'} />
          </Section>

          {sub.boxesTotal > 0 && (
            <div style={{ background: 'var(--slate-50)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--slate-400)' }}>
                <span>Box progress</span><span>{Math.round((sub.boxesDelivered / sub.boxesTotal) * 100)}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--slate-200b)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--teal-600)', borderRadius: 999, width: `${Math.min(100, (sub.boxesDelivered / sub.boxesTotal) * 100)}%` }} />
              </div>
            </div>
          )}

          <div>
            {sectionHead('Dog', 'dog', !ended)}
            <div style={{ background: 'var(--slate-50)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--slate-100)' }}>
              {editing === 'dog' ? <DogEditor sub={sub} onSaved={onSaved} onDone={() => setEditing(null)} /> : sub.dog ? (
                <>
                  <Row label="Name" value={sub.dog.name} />
                  {sub.dog.breed && <Row label="Breed" value={sub.dog.breed} />}
                  <Row label="Size" value={sub.dog.size ? sub.dog.size.replace('_', ' ').toLowerCase() : '—'} />
                  <Row label="Allergies" value={sub.dog.allergies?.length ? sub.dog.allergies.join(', ') : 'None'} />
                  {sub.dog.specialNotes && <Row label="Notes" value={sub.dog.specialNotes} />}
                </>
              ) : <p style={{ margin: 0, padding: '10px 14px', fontSize: 13, color: 'var(--slate-500)' }}>No dog profile yet.</p>}
            </div>
          </div>

          <div>
            {sectionHead('Boxes go to', 'address', !ended)}
            <div style={{ background: 'var(--slate-50)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--slate-100)' }}>
              {editing === 'address' ? <AddressEditor sub={sub} onSaved={onSaved} onDone={() => setEditing(null)} /> : sub.address ? (
                <p style={{ margin: 0, padding: '10px 14px', fontSize: 13, color: 'var(--slate-800)', lineHeight: 1.5 }}>
                  {sub.address.firstName} {sub.address.lastName} · {sub.address.phone}<br />
                  <span style={{ color: 'var(--slate-500)' }}>{sub.address.city}, {[sub.address.addressLine1, sub.address.addressLine2].filter(Boolean).join(', ')}</span><MapLink address={sub.address} />
                </p>
              ) : <p style={{ margin: 0, padding: '10px 14px', fontSize: 13, color: 'var(--amber-700)' }}>No address yet.</p>}
            </div>
          </div>

          <Section title="Dates">
            <Row label="Started" value={day(sub.startDate || sub.createdAt)} />
            <Row label="Ends" value={day(sub.endDate)} />
            <Row label="Next renewal" value={day(sub.nextRenewalAt)} />
            {sub.cancelReason && <Row label="Cancel reason" value={sub.cancelReason} />}
          </Section>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--slate-100)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {sub.status === 'PAUSED' && <button onClick={() => onResume(sub)} style={actionBtn('var(--teal-600)')}>Resume</button>}
          {['ACTIVE', 'PAUSED'].includes(sub.status) && !sub.cancelledAt && <button onClick={() => onCancel(sub)} style={actionBtn('var(--red-600)')}>Cancel subscription…</button>}
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-500)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
      <div style={{ background: 'var(--slate-50)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--slate-100)' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--slate-100)' }}>
      <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-800)' }}>{value}</span>
    </div>
  );
}

function actionBtn(bg: string): React.CSSProperties {
  return { padding: '8px 18px', borderRadius: 10, border: 'none', background: bg, color: 'var(--white)', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  // "Gifts only", which the dashboard card deep-links to via ?gifts=1.
  //
  // `null` means "haven't read the URL yet", and the first fetch waits for it.
  // Reading window.location during the initial render instead would not match
  // what the server rendered and breaks hydration; setting it in an effect
  // without this gate fired a second fetch racing the unfiltered one, whose
  // slower response landed last and replaced the filtered rows.
  const [gifts, setGifts] = useState<boolean | null>(null);
  const [giftCount, setGiftCount] = useState(0);
  const [resending, setResending] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [confirm, setConfirm] = useState<null | { label: string; color: string; title: string; message: string; run: () => Promise<void> }>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // Rising counter so a slow earlier request cannot overwrite a newer one when
  // filters are changed quickly.
  const requestSeq = useRef(0);

  async function load() {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (gifts) params.set('gifts', '1');
      const qs = params.toString() ? `?${params}` : '';
      const data = await getOr<any>(`/admin/subscriptions${qs}`, null);
      if (data) {
        if (seq !== requestSeq.current) return; // a newer request has since been issued
        setSubs(data.items || []);
        setTotal(data.total || 0);
        setStatusCounts(data.statusCounts ?? {});
        setGiftCount(data.giftCount ?? 0);
      }
    } catch { } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('gifts');
    setGifts(q === '1' || q === 'true');
  }, []);

  useEffect(() => { if (gifts !== null) load(); }, [status, gifts]);

  async function resendGiftCard(id: string) {
    setResending(id);
    try {
      const body = await post(`/admin/gifts/${id}/resend`);
      alert(`Gift note resent to ${body.to}`);
    } catch (e: any) {
      alert(e.status ? `Could not resend: ${e.message}` : 'Could not resend the gift note.');
    } finally {
      setResending(null);
    }
  }

  /** Cancel under the shop's rule — admin sees what the customer gets before confirming. */
  async function askCancel(sub: any, e?: React.MouseEvent) {
    e?.stopPropagation();
    let p;
    try { p = await api(`/admin/subscriptions/${sub.id}/cancel-preview`, { fallback: 'Could not work out the cancellation.' }); }
    catch (e: any) { alert(e.message); return; }
    if (!p) { alert('Could not work out the cancellation.'); return; }
    const name = `${sub.user?.firstName} ${sub.user?.lastName}`;
    const what = p.kind === 'free'
      ? `Within the free ${p.freeHours}-hour window: no box is sent and ₾${p.refund.toFixed(2)} is refunded in full.`
      : `${p.thisMonthBoxComing ? 'This month’s box still ships; later' : 'No more boxes;'} ${p.boxesTotal - p.keptBoxes} month(s) stop${p.refund > 0 ? ` and ₾${p.refund.toFixed(2)} becomes refund due on the order` : ''}.`;
    setConfirm({
      title: `Cancel ${name}’s subscription?`, message: what, label: 'Yes, cancel', color: 'var(--red-600)',
      run: async () => {
        await post(`/admin/subscriptions/${sub.id}/cancel`, { reason: 'Cancelled by admin' }, 'Not cancelled.').catch((e) => alert(e.message));
      },
    });
  }

  function askResume(sub: any, e?: React.MouseEvent) {
    e?.stopPropagation();
    setConfirm({
      title: 'Resume this subscription?', message: `${sub.user?.firstName}’s boxes start again from the next monthly list.`, label: 'Yes, resume', color: 'var(--teal-600)',
      run: async () => {
        await patch(`/admin/subscriptions/${sub.id}`, { status: 'ACTIVE' }, 'Not resumed.').catch((e) => alert(e.message));
      },
    });
  }

  const counts = {
    active:    statusCounts.ACTIVE ?? 0,
    paused:    statusCounts.PAUSED ?? 0,
    cancelled: statusCounts.CANCELLED ?? 0,
  };

  const tabs = [
    { label: 'All',       val: '',          count: total },
    { label: 'Active',    val: 'ACTIVE',    count: counts.active },
    { label: 'Paused',    val: 'PAUSED',    count: counts.paused },
    { label: 'Cancelled', val: 'CANCELLED', count: counts.cancelled },
  ];

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Subscriptions</h1>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{total} subscriptions total</p>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {tabs.map(t => (
          <button
            key={t.val}
            onClick={() => { setStatus(t.val); setGifts(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: status === t.val ? 'none' : '1px solid var(--slate-200)', background: status === t.val ? 'var(--slate-900)' : 'var(--white)', color: status === t.val ? 'var(--white)' : 'var(--slate-500)', transition: 'all 0.12s' }}
          >
            {t.label}
            <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: status === t.val ? 'rgba(255,255,255,0.2)' : 'var(--slate-100)', color: status === t.val ? 'var(--white)' : 'var(--slate-400)' }}>{t.count}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <button
          onClick={() => { setGifts(!gifts); setStatus(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: `1px solid ${gifts ? 'var(--amber-600)' : 'var(--slate-200)'}`, background: gifts ? 'var(--amber-600)' : 'var(--white)', color: gifts ? 'var(--white)' : 'var(--slate-500)', transition: 'all 0.12s' }}
        >
          🎁 Gifts only
          {giftCount > 0 && (
            <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: gifts ? 'rgba(255,255,255,0.25)' : 'var(--amber-50)', color: gifts ? 'var(--white)' : 'var(--amber-700)' }}>{giftCount}</span>
          )}
        </button>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : subs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔄</div>
            <p style={{ fontSize: 13 }}>No subscriptions found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Customer', 'Plan', 'Dog', 'Status', 'Progress', 'Renewal', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const sc = STATUS_COLORS[s.status] || STATUS_COLORS.EXPIRED;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    style={{ borderBottom: '1px solid var(--slate-50)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <p style={{ fontWeight: 600, color: 'var(--slate-800)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {s.user?.firstName} {s.user?.lastName}
                        {s.isGift && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'var(--amber-50)', color: 'var(--amber-700)', border: '1px solid var(--amber-200)', whiteSpace: 'nowrap' }}>
                            🎁 GIFT
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>{s.user?.email}</p>
                      {/* The row's customer is the buyer; the boxes go to the friend. */}
                      {s.isGift && (
                        <p style={{ fontSize: 11, color: 'var(--amber-700)', margin: '3px 0 0' }}>
                          → for {s.giftRecipientName || 'a friend'}{s.address?.city ? `, ${s.address.city}` : ''}
                          {s.startDate && new Date(s.startDate) > new Date() && (
                            <span style={{ color: 'var(--slate-400)' }}> · starts {new Date(s.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          )}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <p style={{ fontWeight: 600, color: 'var(--slate-800)', margin: 0 }}>{s.plan?.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>₾{Number(s.plan?.price ?? 0).toFixed(0)}</p>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--slate-500)' }}>
                      {s.dog?.name ? s.dog.name : <span style={{ color: 'var(--slate-200)' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ ...sc, display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{s.status}</span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: 'var(--slate-100)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--teal-600)', borderRadius: 999, width: `${s.boxesTotal ? Math.min(100, (s.boxesDelivered / s.boxesTotal) * 100) : 0}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>{s.boxesDelivered}/{s.boxesTotal}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--slate-500)' }}>
                      {s.nextRenewalAt ? new Date(s.nextRenewalAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 18px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {s.isGift && s.giftRecipientEmail && !s.cancelledAt && (
                          <button
                            onClick={() => resendGiftCard(s.id)}
                            disabled={resending === s.id}
                            title={`Email the "a gift is on its way" note to ${s.giftRecipientEmail} again`}
                            style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--amber-50)', color: 'var(--amber-700)', border: 'none', cursor: resending === s.id ? 'default' : 'pointer', fontWeight: 600, opacity: resending === s.id ? 0.6 : 1 }}
                          >
                            {resending === s.id ? 'Sending…' : '🎁 Resend note'}
                          </button>
                        )}
                        {s.status === 'PAUSED' && (
                          <button onClick={e => askResume(s, e)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--green-50)', color: 'var(--green-800)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Resume</button>
                        )}
                        {['ACTIVE', 'PAUSED'].includes(s.status) && !s.cancelledAt && (
                          <button onClick={e => askCancel(s, e)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                        )}
                        {s.cancelledAt && s.status === 'ACTIVE' && <span style={{ fontSize: 11, color: 'var(--amber-700)', fontWeight: 700 }}>Last box this month</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          sub={selected}
          onClose={() => setSelected(null)}
          onCancel={sub => askCancel(sub)}
          onResume={sub => askResume(sub)}
          onSaved={async () => {
            // Show the edit straight away in the open panel and in the list.
            const fresh = await getOr<any>(`/admin/subscriptions/${selected.id}`, null);
            if (fresh) { setSelected((cur: any) => (cur ? { ...cur, ...fresh } : cur)); }
            load();
          }}
        />
      )}

      {/* Confirm modal (from table row actions) */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          confirmColor={confirm.color}
          onConfirm={async () => { const c = confirm; setConfirm(null); await c.run(); setSelected(null); load(); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
