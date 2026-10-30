'use client';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import SideDrawer from '@/components/SideDrawer';
import NumberField from '@/components/NumberField';
import { ActionButton } from '@/components/Toolbar';
import { PURCHASE_STRINGS } from '@pupbox/content';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}` });
const err = (d: any, f: string) => (Array.isArray(d?.message) ? d.message[0] : d?.message) || f;
const can = (perm: string) => {
  try { return (JSON.parse(atob((localStorage.getItem('admin_token') || '').split('.')[1])).permissions ?? []).includes(perm); } catch { return false; }
};

type Method = { id: string; name: string; nameKa: string; price: number; freeThreshold: number | null; estimatedDays: string | null; isActive: boolean; sortOrder: number; orders: number };
type Form = { name: string; nameKa: string; price: string; free: boolean; freeThreshold: string; days: string; isActive: boolean };
const EMPTY: Form = { name: '', nameKa: '', price: '', free: false, freeThreshold: '', days: '', isActive: true };
const gel = (n: number) => `₾${n.toFixed(2).replace(/\.00$/, '')}`;
/** The Georgian name: admin's, else the site's built-in one for the original options. */
const kaName = (m: { name: string; nameKa: string }) => m.nameKa || PURCHASE_STRINGS[`dm.${m.name}`]?.ka || '';
const daysText = (d: string | null) => (!d ? '' : d === '1' ? 'next day' : `${d} days`);

/**
 * Admin → Delivery: the options customers pick at checkout. Name in both
 * languages, price, free above an amount, how many days it takes, on/off and
 * the order they're shown in. A plan sold with delivery included covers the
 * cheapest option that's on.
 */
export default function DeliveryPage() {
  const [list, setList] = useState<Method[] | null>(null);
  const [editing, setEditing] = useState<Method | 'new' | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [start, setStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [edit, setEdit] = useState(false);

  const call = async (path: string, method: string, body?: unknown) => {
    const r = await fetch(`${API}/admin/delivery${path}`, { method, headers: { ...auth(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(err(d, `Not saved (error ${r.status}).`));
    setList(d);
    return d;
  };
  useEffect(() => {
    setEdit(can('cms.edit'));
    fetch(`${API}/admin/delivery`, { headers: auth() }).then((r) => (r.ok ? r.json() : [])).then(setList).catch(() => setList([]));
  }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t); } }, [toast]);

  function open(m: Method | 'new') {
    const f: Form = m === 'new' ? EMPTY : { name: m.name, nameKa: kaName(m), price: String(m.price), free: m.freeThreshold != null, freeThreshold: m.freeThreshold != null ? String(m.freeThreshold) : '', days: m.estimatedDays ?? '', isActive: m.isActive };
    setEditing(m); setForm(f); setStart(JSON.stringify(f)); setError('');
  }
  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => { setForm((x) => ({ ...x, [k]: v })); setError(''); };
  const dirty = useMemo(() => JSON.stringify(form) !== start, [form, start]);

  async function save() {
    if (!form.name.trim() || !form.nameKa.trim()) return setError('Add the name in both languages.');
    if (form.price === '' || !(Number(form.price) >= 0)) return setError('Add the price (0 for free delivery).');
    if (form.free && !(Number(form.freeThreshold) > 0)) return setError('Add the amount above which delivery is free, or untick it.');
    if (form.days && !/^\d{1,2}(-\d{1,2})?$/.test(form.days.trim())) return setError('Delivery days: a number like 2, or a range like 3-5.');
    setBusy(true);
    try {
      const body = { name: form.name.trim(), nameKa: form.nameKa.trim(), price: Number(form.price), freeThreshold: form.free ? Number(form.freeThreshold) : null, estimatedDays: form.days.trim(), isActive: form.isActive };
      await call(editing === 'new' ? '' : `/${(editing as Method).id}`, editing === 'new' ? 'POST' : 'PUT', body);
      setToast(editing === 'new' ? 'Delivery option added' : 'Saved');
      setEditing(null);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function quick(fn: () => Promise<unknown>, msg: string) {
    try { await fn(); setToast(msg); } catch (e: any) { alert(e.message); }
  }
  const move = (i: number, dir: -1 | 1) => {
    const ids = (list ?? []).map((m) => m.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    quick(() => call('/order/all', 'PUT', { ids }), 'Order changed');
  };

  const on = (list ?? []).filter((m) => m.isActive);
  const cheapest = on.length ? Math.min(...on.map((m) => m.price)) : null;

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 28px)', maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ flex: '1 1 260px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>🚚 Delivery</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 0' }}>The options customers choose at checkout. Changes show on the site straight away.</p>
        </div>
        {edit && <ActionButton onClick={() => open('new')}>＋ New option</ActionButton>}
      </div>

      {!list ? <p style={{ color: 'var(--slate-400)' }}>Loading…</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {list.length === 0 && <p style={note}>No delivery options yet — customers can’t check out until you add one.</p>}
          {list.map((m, i) => (
            <div key={m.id} style={{ ...card, opacity: m.isActive ? 1 : 0.6, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {edit && list.length > 1 && (
                <div style={{ display: 'grid', gap: 2 }}>
                  <button type="button" aria-label={`Move ${m.name} up`} disabled={i === 0} onClick={() => move(i, -1)} style={{ ...arrow, opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                  <button type="button" aria-label={`Move ${m.name} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)} style={{ ...arrow, opacity: i === list.length - 1 ? 0.3 : 1 }}>▼</button>
                </div>
              )}
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 15, color: 'var(--slate-900)' }}>{m.name}</strong>
                  <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>{kaName(m)}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: m.isActive ? 'var(--green-50)' : 'var(--slate-100)', color: m.isActive ? 'var(--green-800)' : 'var(--slate-500)' }}>{m.isActive ? 'On' : 'Off'}</span>
                  {m.isActive && m.price === cheapest && on.length > 1 && <span title="Plans with delivery included cover this one" style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--teal-50)', color: 'var(--teal-800)' }}>Included with plans</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 3 }}>
                  {m.price === 0 ? 'Free' : gel(m.price)}
                  {m.freeThreshold != null && ` · free over ${gel(m.freeThreshold)}`}
                  {m.estimatedDays && ` · ${daysText(m.estimatedDays)}`}
                  {m.orders > 0 && <span style={{ color: 'var(--slate-400)' }}> · used by {m.orders} order{m.orders === 1 ? '' : 's'}</span>}
                </div>
              </div>
              {edit && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <ActionButton variant="secondary" onClick={() => open(m)} style={small}>Edit</ActionButton>
                  <ActionButton variant="secondary" style={small}
                    onClick={() => quick(() => call(`/${m.id}`, 'PUT', { name: m.name, nameKa: kaName(m), price: m.price, freeThreshold: m.freeThreshold, estimatedDays: m.estimatedDays ?? '', isActive: !m.isActive }), m.isActive ? 'Switched off' : 'Switched on')}>
                    {m.isActive ? 'Switch off' : 'Switch on'}
                  </ActionButton>
                  {m.orders === 0 && <ActionButton variant="secondary" style={{ ...small, color: 'var(--red-600)' }} onClick={() => { if (confirm(`Delete “${m.name}”? This can’t be undone.`)) quick(() => call(`/${m.id}`, 'DELETE'), 'Deleted'); }}>Delete</ActionButton>}
                </div>
              )}
            </div>
          ))}
          <p style={{ ...note, marginTop: 4 }}>💡 A plan sold with delivery included covers the cheapest option that’s on; a faster one costs the customer only the difference. “Free over” applies to the basket total before delivery.</p>
        </div>
      )}

      {toast && <div role="status" style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'var(--slate-900)', color: '#fff', padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 80 }}>{toast}</div>}

      <SideDrawer open={editing !== null} onClose={() => setEditing(null)} dirty={dirty && !busy} width={520}
        title={editing === 'new' ? 'New delivery option' : 'Edit delivery option'} subtitle="Shown at checkout in the customer’s language."
        footer={(close) => (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ActionButton variant="secondary" onClick={close}>Cancel</ActionButton>
            <span style={{ flex: 1 }} />
            <ActionButton onClick={save} disabled={busy || (editing !== 'new' && !dirty)}>{busy ? 'Saving…' : editing === 'new' ? 'Add option' : 'Save changes'}</ActionButton>
          </div>
        )}>
        <label style={lab}>Name</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
          <input value={form.nameKa} onChange={(e) => set('nameKa')(e.target.value)} maxLength={60} placeholder="🇬🇪 სტანდარტული მიწოდება" aria-label="Name in Georgian" style={inp} />
          <input value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={60} placeholder="🇬🇧 Standard delivery" aria-label="Name in English" style={inp} />
        </div>

        <label style={lab}>Price</label>
        <NumberField value={form.price} onChange={(v) => set('price')(v)} decimals prefix="₾" max={1000} placeholder="5.99" ariaLabel="Price" />
        <p style={hint}>0 makes it always free.</p>

        <label style={{ ...lab, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.free} onChange={(e) => set('free')(e.target.checked)} /> Free when the basket comes to at least…
        </label>
        {form.free && <NumberField value={form.freeThreshold} onChange={(v) => set('freeThreshold')(v)} decimals prefix="₾" max={100000} placeholder="60" ariaLabel="Free over" />}

        <label style={lab}>How long it takes</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input value={form.days} onChange={(e) => set('days')(e.target.value.replace(/[^\d-]/g, ''))} maxLength={5} placeholder="3-5" aria-label="Delivery days" style={{ ...inp, width: 90 }} />
          <span style={{ fontSize: 13, color: 'var(--slate-600)' }}>days</span>
        </div>
        <p style={hint}>A number (1 shows as “next day”) or a range like 3-5. Leave empty to show nothing.</p>

        <label style={{ ...lab, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive')(e.target.checked)} /> On — customers can choose it
        </label>

        {error && <p role="alert" style={{ color: 'var(--red-600)', fontSize: 13, fontWeight: 600, margin: '16px 0 0' }}>{error}</p>}
      </SideDrawer>
    </div>
  );
}

const card: CSSProperties = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, padding: 14 };
const note: CSSProperties = { fontSize: 12.5, color: 'var(--slate-600)', background: 'var(--slate-50)', borderRadius: 10, padding: '8px 12px', lineHeight: 1.5, margin: 0 };
const inp: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', fontSize: 13.5, border: '1px solid var(--slate-200)', borderRadius: 10, outline: 'none', background: 'var(--white)', color: 'var(--slate-900)', fontFamily: 'inherit' };
const lab: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', margin: '16px 0 6px' };
const hint: CSSProperties = { fontSize: 11.5, color: 'var(--slate-400)', margin: '5px 0 0' };
const small: CSSProperties = { padding: '5px 12px', fontSize: 12 };
const arrow: CSSProperties = { border: '1px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-600)', borderRadius: 6, fontSize: 9, width: 26, height: 20, cursor: 'pointer', lineHeight: 1 };
