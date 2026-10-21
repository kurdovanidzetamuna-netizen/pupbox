'use client';
import { useEffect, useMemo, useState } from 'react';
import { API, authHeaders, jsonHeaders, money, apiError, Thumb, sectionTitle, card, input, btn } from '../_lib';
import CategoryPicker, { type Cat } from './CategoryPicker';
import Dropdown from '@/components/Dropdown';

/**
 * Edit an order that hasn't left: where it goes, which dog it's for, the gift
 * card and its shop products. Plans and built boxes stay as they are.
 * The totals underneath update as you go, so the effect is clear before
 * saving: unpaid orders get a new amount to pay; paid ones can only lose
 * items, and what comes off becomes "refund due".
 */
export default function OrderEditor({ orderId, categories, onDone, onCancel }: {
  orderId: string; categories: Cat[]; onDone: (order: any) => void; onCancel: () => void;
}) {
  const [order, setOrder] = useState<any>(null);
  const [addr, setAddr] = useState<any>({});
  const [addressForPlan, setAddressForPlan] = useState(true);
  const [dogId, setDogId] = useState<string>('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [added, setAdded] = useState<{ product: any; quantity: number }[]>([]);
  const [gift, setGift] = useState({ name: '', message: '' });
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Adding a product: pick a category (and subcategory), search, tap.
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<any[]>([]);
  const [start, setStart] = useState('');

  useEffect(() => {
    fetch(`${API}/orders/admin/${orderId}`, { headers: authHeaders() }).then((r) => r.json()).then((o) => {
      setOrder(o);
      const a = o.address || {};
      setAddr({ firstName: a.firstName || '', lastName: a.lastName || '', phone: a.phone || '', city: a.city || '', addressLine1: a.addressLine1 || '', addressLine2: a.addressLine2 || '', postalCode: a.postalCode || '' });
      setDogId(o.dogId || '');
      setQty(Object.fromEntries(o.items.filter(editableLine).map((i: any) => [i.id, i.quantity])));
      setGift({ name: o.giftRecipientName || '', message: o.giftMessage || '' });
      setStart('');
    });
  }, [orderId]);

  const paid = order?.payments?.some((p: any) => p.status === 'PAID');
  const slug = useMemo(() => categories.flatMap((c) => [c, ...(c.children || [])]).find((c) => c.id === cat)?.slug ?? '', [cat, categories]);

  // Products to add (unpaid orders only), by category and/or name.
  useEffect(() => {
    if (!order || paid || (!slug && q.trim().length < 2)) { setFound([]); return; }
    const t = setTimeout(() => {
      const p = new URLSearchParams({ limit: '12', ...(slug ? { category: slug } : {}), ...(q.trim() ? { search: q.trim() } : {}) });
      fetch(`${API}/admin/products?${p}`, { headers: authHeaders() }).then((r) => r.json()).then((d) => setFound((d.items || d.products || []).filter((x: any) => !x.deletedAt))).catch(() => setFound([]));
    }, 250);
    return () => clearTimeout(t);
  }, [slug, q, order, paid]);

  const snapshot = JSON.stringify([addr, dogId, qty, added.map((a) => [a.product.id, a.quantity]), gift, reason, addressForPlan]);
  useEffect(() => { if (order && !start) setStart(snapshot); }, [order, snapshot, start]);
  const dirty = !!start && snapshot !== start;
  // Esc leaves the editor — asking first if something was changed.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (!dirty || confirm('Discard your changes to this order?')) onCancel();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [dirty, onCancel]);

  if (!order) return <p style={{ color: 'var(--slate-400)', fontSize: 13 }}>Loading…</p>;

  const lines = order.items as any[];
  const unit = (p: any) => Number(p.salePrice ?? p.price);
  const fixedTotal = lines.filter((i) => !editableLine(i)).reduce((n, i) => n + Number(i.total), 0);
  const subtotal = fixedTotal + lines.filter(editableLine).reduce((n, i) => n + Number(i.price) * (qty[i.id] ?? 0), 0) + added.reduce((n, a) => n + unit(a.product) * a.quantity, 0);
  const discount = order.coupon
    ? order.coupon.discountType === 'PERCENTAGE' ? subtotal * Number(order.coupon.discountValue) / 100 : Math.min(Number(order.coupon.discountValue), subtotal)
    : Math.min(Number(order.discountAmount), subtotal);
  const total = Math.max(0, subtotal - discount) + Number(order.deliveryCost);
  const diff = +(total - Number(order.total)).toFixed(2);
  const itemsChanged = lines.some((i) => editableLine(i) && qty[i.id] !== i.quantity) || added.length > 0;
  const nothingLeft = !lines.some((i) => !editableLine(i)) && !lines.some((i) => editableLine(i) && (qty[i.id] ?? 0) > 0) && !added.length;

  const setLine = (id: string, n: number, max: number) => setQty((x) => ({ ...x, [id]: Math.max(0, Math.min(max, n)) }));
  function add(p: any) {
    // Already on the order (and not personalised): one more of that line.
    const same = order.items.find((i: any) => editableLine(i) && i.productId === p.id && !i.personalisation);
    if (same) { setQty((x) => ({ ...x, [same.id]: (x[same.id] ?? 0) + 1 })); return; }
    setAdded((a) => (a.some((x) => x.product.id === p.id) ? a.map((x) => (x.product.id === p.id ? { ...x, quantity: x.quantity + 1 } : x)) : [...a, { product: p, quantity: 1 }]));
  }

  async function save() {
    if (nothingLeft) { setError('An order needs at least one item. To drop everything, cancel the order instead.'); return; }
    if (paid && diff < 0 && !confirm(`This takes ${money(-diff)} off a paid order. It will show “Refund due” until you record the refund. Continue?`)) return;
    setSaving(true); setError('');
    const body: any = { address: addr, addressForPlan, dogId: dogId || null, reason: reason.trim() || undefined };
    if (itemsChanged) body.items = [...lines.filter(editableLine).map((i) => ({ id: i.id, quantity: qty[i.id] ?? 0 })), ...added.map((a) => ({ productId: a.product.id, quantity: a.quantity }))];
    if (order.isGift) { body.giftRecipientName = gift.name; body.giftMessage = gift.message; }
    const r = await fetch(`${API}/orders/admin/${orderId}`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setError(apiError(d)); return; }
    onDone(d);
  }

  const field = (k: string, label: string, wide = false) => (
    <label style={{ gridColumn: wide ? '1 / -1' : undefined, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--slate-600)' }}>
      {label}<input value={addr[k] ?? ''} onChange={(e) => setAddr((a: any) => ({ ...a, [k]: e.target.value }))} style={input} />
    </label>
  );
  const stepper = (value: number, on: (n: number) => void, max: number, label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--slate-200)', borderRadius: 999, background: 'var(--white)' }}>
      <button type="button" aria-label={`One less ${label}`} onClick={() => on(value - 1)} style={stepBtn}>−</button>
      <span style={{ minWidth: 22, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{value}</span>
      <button type="button" aria-label={`One more ${label}`} onClick={() => on(value + 1)} disabled={value >= max} style={{ ...stepBtn, opacity: value >= max ? 0.35 : 1 }}>+</button>
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...card, background: paid ? 'var(--amber-50)' : 'var(--teal-50)', border: `1px solid ${paid ? 'var(--amber-200)' : 'var(--teal-200)'}`, fontSize: 12.5, color: 'var(--slate-700)', lineHeight: 1.5 }}>
        {paid
          ? <><strong>Paid order.</strong> You can change the address, dog and gift card, and take products off (what comes off becomes “refund due”). Adding products isn’t possible — the customer can’t be charged more from here.</>
          : <><strong>Unpaid order.</strong> Change anything — products, quantities, address. The amount the customer pays follows the new total.</>}
      </div>

      {/* Items */}
      <div style={card}>
        <p style={sectionTitle}>Items</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lines.map((i) => {
            const editable = editableLine(i);
            const n = editable ? qty[i.id] ?? 0 : i.quantity;
            return (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: n === 0 ? 0.45 : 1 }}>
                <Thumb item={i} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--slate-800)', textDecoration: n === 0 ? 'line-through' : 'none' }}>{i.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--slate-400)' }}>
                    {money(i.price)} each{!editable && ` · ${i.subscriptionPlanId ? '🔒 plan' : i.customBoxId ? '🔒 built box' : '🔒 paid to seller'}`}
                  </p>
                </div>
                {editable ? (
                  <>
                    {stepper(n, (v) => setLine(i.id, v, paid ? i.quantity : 999), paid ? i.quantity : 999, i.name)}
                    <button type="button" aria-label={`Remove ${i.name}`} title="Remove" onClick={() => setLine(i.id, n === 0 ? i.quantity : 0, 999)}
                      style={{ ...stepBtn, width: 30, height: 30, borderRadius: 8, border: '1px solid var(--slate-200)', color: n === 0 ? 'var(--teal-700)' : 'var(--red-600)', fontSize: 12 }}>{n === 0 ? '↺' : '✕'}</button>
                  </>
                ) : <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>×{i.quantity}</span>}
              </div>
            );
          })}
          {added.map((a) => (
            <div key={a.product.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Thumb item={{ product: a.product }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--slate-800)' }}>{a.product.name} <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--teal-50)', borderRadius: 99, padding: '1px 6px' }}>new</span></p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--slate-400)' }}>{money(unit(a.product))} each</p>
              </div>
              {stepper(a.quantity, (v) => setAdded((x) => v <= 0 ? x.filter((y) => y.product.id !== a.product.id) : x.map((y) => (y.product.id === a.product.id ? { ...y, quantity: v } : y))), 999, a.product.name)}
            </div>
          ))}
        </div>

        {!paid && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--slate-200)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--slate-700)' }}>Add a product</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <CategoryPicker categories={categories} value={cat} onChange={setCat} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" style={{ ...input, flex: '1 1 160px', width: 'auto' }} />
            </div>
            {found.length > 0 && (
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
                {found.map((p) => (
                  <button key={p.id} type="button" onClick={() => add(p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, borderRadius: 10, border: '1px solid var(--slate-200)', background: 'var(--white)', cursor: 'pointer', textAlign: 'left' }}>
                    <Thumb item={{ product: p }} size={30} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--teal-700)', fontWeight: 700 }}>+ {money(unit(p))}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {(slug || q.trim().length >= 2) && found.length === 0 && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--slate-400)' }}>No products found.</p>}
          </div>
        )}

        {/* What it comes to */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '2px solid var(--slate-200b)', fontSize: 12.5, display: 'grid', gap: 4 }}>
          <Row k="Items" v={money(subtotal)} />
          {discount > 0 && <Row k={`Discount${order.coupon ? ` (${order.coupon.code})` : ''}`} v={`−${money(discount)}`} color="var(--green-600)" />}
          {Number(order.deliveryCost) > 0 && <Row k="Delivery" v={money(order.deliveryCost)} />}
          <Row k="New total" v={money(total)} bold />
          {diff !== 0 && <Row k={paid ? 'Refund due' : 'Change'} v={`${diff > 0 ? '+' : '−'}${money(Math.abs(diff))}`} color={paid ? 'var(--red-600)' : 'var(--slate-500)'} />}
        </div>
      </div>

      {/* Address */}
      <div style={card}>
        <p style={sectionTitle}>{order.isGift ? 'Deliver to (gift recipient)' : 'Delivery address'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {field('firstName', 'First name')}{field('lastName', 'Last name')}
          {field('phone', 'Phone')}{field('city', 'City')}
          {field('addressLine1', 'Street and number', true)}
          {field('addressLine2', 'Flat, floor, entrance')}{field('postalCode', 'Postcode')}
        </div>
        {order.subscription && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, fontSize: 12.5, color: 'var(--slate-700)' }}>
            <input type="checkbox" checked={addressForPlan} onChange={(e) => setAddressForPlan(e.target.checked)} /> Send the plan’s next boxes here too
          </label>
        )}
      </div>

      {/* Dog */}
      {(order.user?.dogs?.length > 0 || order.dog) && (
        <div style={card}>
          <p style={sectionTitle}>Dog</p>
          <Dropdown block aria-label="Dog" icon="🐶" value={dogId} onChange={setDogId} options={[
            { value: '', label: 'No dog' },
            ...(order.dog && !order.user?.dogs?.some((d: any) => d.id === order.dog.id) ? [{ value: order.dog.id, label: `${order.dog.name} (gift)` }] : []),
            ...(order.user?.dogs || []).map((d: any) => ({ value: d.id, label: d.name, hint: [d.breed, d.size].filter(Boolean).join(' · ') || undefined })),
          ]} />
        </div>
      )}

      {order.isGift && (
        <div style={card}>
          <p style={sectionTitle}>Gift card</p>
          <div style={{ display: 'grid', gap: 10 }}>
            <input value={gift.name} onChange={(e) => setGift((g) => ({ ...g, name: e.target.value }))} placeholder="Recipient’s name" style={input} />
            <textarea value={gift.message} onChange={(e) => setGift((g) => ({ ...g, message: e.target.value }))} rows={3} placeholder="Message on the card" style={{ ...input, resize: 'vertical' }} />
          </div>
        </div>
      )}

      <div style={card}>
        <p style={sectionTitle}>Why (kept on the order)</p>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer called to change the address" style={input} />
      </div>

      {error && <p role="alert" style={{ margin: 0, fontSize: 12.5, color: 'var(--red-600)', background: 'var(--red-50)', border: '1px solid var(--red-200)', borderRadius: 9, padding: '8px 12px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: 'var(--white)', padding: '12px 0', borderTop: '1px solid var(--slate-200b)' }}>
        <button type="button" onClick={() => { if (!dirty || confirm('Discard your changes to this order?')) onCancel(); }} style={btn(false)}>Cancel</button>
        <button type="button" onClick={save} disabled={saving} style={{ ...btn(true), opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </div>
  );
}

/** A shop product line this screen may change (not a plan, built box or paid-out seller line). */
const editableLine = (i: any) => !!i.productId && !i.customBoxId && !i.payoutId;
const stepBtn = { width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: 'var(--slate-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } as const;

function Row({ k, v, bold, color }: { k: string; v: string; bold?: boolean; color?: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: bold ? 800 : 500, fontSize: bold ? 14 : 12.5, color: color ?? (bold ? 'var(--slate-900)' : 'var(--slate-600)') }}><span>{k}</span><span>{v}</span></div>;
}
