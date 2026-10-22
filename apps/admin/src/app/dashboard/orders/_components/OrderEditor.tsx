'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { API, authHeaders, jsonHeaders, money, apiError, Thumb } from '../_lib';
import CategoryPicker, { type Cat } from './CategoryPicker';
import ConfirmSheet from './ConfirmSheet';

const EMPTY_ADDR = { firstName: '', lastName: '', phone: '', city: '', addressLine1: '', addressLine2: '', postalCode: '' };
const SIZE: Record<string, string> = { EXTRA_SMALL: 'XS', SMALL: 'S', MEDIUM: 'M', LARGE: 'L', EXTRA_LARGE: 'XL' };
const show = (a: any) => (a ? [a.addressLine1, a.addressLine2, a.city].filter(Boolean).join(', ') : '—');

/**
 * Change an order before it ships, in short numbered sections — what's in
 * it, where it goes, which dog, the gift card — and a bar at the bottom that
 * counts the changes and says what they do to the money. "Review changes"
 * lists each one as before → after, then saves.
 *
 * Items: anything can be added. Unpaid: the amount to pay follows. Paid:
 * taking off becomes "refund due"; adding becomes a separate extra payment
 * the customer pays by link (text + their account).
 * Address: one of the customer's saved addresses, or "+ New address" — it's
 * saved to their account too, so they see it next time.
 */
export default function OrderEditor({ orderId, categories, onDone, onCancel }: {
  orderId: string; categories: Cat[]; onDone: (order: any, summary?: string) => void; onCancel: () => void;
}) {
  const [order, setOrder] = useState<any>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [added, setAdded] = useState<{ product: any; quantity: number }[]>([]);
  const [addressId, setAddressId] = useState('');
  const [newAddr, setNewAddr] = useState<any>(null);
  const [addressForPlan, setAddressForPlan] = useState(true);
  const [dogId, setDogId] = useState('');
  const [gift, setGift] = useState({ name: '', message: '' });
  const [reason, setReason] = useState('');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<any[]>([]);
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/orders/admin/${orderId}`, { headers: authHeaders() }).then((r) => r.json()).then((o) => {
      setOrder(o);
      setQty(Object.fromEntries(o.items.filter(editableLine).map((i: any) => [i.id, i.quantity])));
      setAddressId(o.addressId || '');
      setDogId(o.dogId || '');
      setGift({ name: o.giftRecipientName || '', message: o.giftMessage || '' });
    });
  }, [orderId]);

  const paid = order?.payments?.some((p: any) => ['PAID', 'PARTIALLY_REFUNDED'].includes(p.status));
  const slug = useMemo(() => categories.flatMap((c) => [c, ...(c.children || [])]).find((c) => c.id === cat)?.slug ?? '', [cat, categories]);

  // Products to add, by category and/or name.
  useEffect(() => {
    if (!order || (!slug && q.trim().length < 2)) { setFound([]); return; }
    const t = setTimeout(() => {
      const p = new URLSearchParams({ limit: '12', ...(slug ? { category: slug } : {}), ...(q.trim() ? { search: q.trim() } : {}) });
      fetch(`${API}/admin/products?${p}`, { headers: authHeaders() }).then((r) => r.json()).then((d) => setFound((d.items || d.products || []).filter((x: any) => !x.deletedAt))).catch(() => setFound([]));
    }, 250);
    return () => clearTimeout(t);
  }, [slug, q, order]);

  const dogs = useMemo(() => {
    if (!order) return [] as any[];
    const own = (order.user?.dogs ?? []) as any[];
    // A gift dog isn't one of the buyer's dogs — keep it choosable.
    return order.dog && !own.some((d) => d.id === order.dog.id) ? [{ ...order.dog, gift: true }, ...own] : own;
  }, [order]);

  // What changed, in words — for the bar and the review.
  const changes = useMemo(() => {
    if (!order) return [] as { what: string; from: string; to: string }[];
    const out: { what: string; from: string; to: string }[] = [];
    for (const l of order.items.filter(editableLine)) {
      const n = qty[l.id] ?? 0;
      if (n !== l.quantity) out.push({ what: l.name, from: `×${l.quantity}`, to: n ? `×${n}` : 'removed' });
    }
    for (const a of added) out.push({ what: a.product.name, from: '—', to: `added ×${a.quantity}` });
    if (newAddr) out.push({ what: 'Delivery address', from: show(order.address), to: `${show(newAddr)} (new)` });
    else if (addressId !== (order.addressId || '')) out.push({ what: 'Delivery address', from: show(order.address), to: show(order.user?.addresses?.find((a: any) => a.id === addressId)) });
    if (dogId !== (order.dogId || '')) out.push({ what: 'Dog', from: order.dog?.name ?? '—', to: dogs.find((d) => d.id === dogId)?.name ?? 'No dog' });
    if (order.isGift && gift.name !== (order.giftRecipientName || '')) out.push({ what: 'Gift for', from: order.giftRecipientName || '—', to: gift.name || '—' });
    if (order.isGift && gift.message !== (order.giftMessage || '')) out.push({ what: 'Gift message', from: 'old text', to: 'new text' });
    return out;
  }, [order, qty, added, addressId, newAddr, dogId, gift, dogs]);
  const dirty = changes.length > 0;

  // Esc leaves the editor — asking first if something was changed.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || review) return;
      if (!dirty || confirm('Discard your changes to this order?')) onCancel();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [dirty, onCancel, review]);

  if (!order) return <p style={{ color: 'var(--slate-400)', fontSize: 13 }}>Loading…</p>;

  const lines = order.items as any[];
  const unit = (p: any) => Number(p.salePrice ?? p.price);
  const addedTotal = added.reduce((n, a) => n + unit(a.product) * a.quantity, 0);
  const fixedTotal = lines.filter((i) => !editableLine(i)).reduce((n, i) => n + Number(i.total), 0);
  // Paid: more of a line, or a new product, goes on an extra payment — this order's total only goes down.
  const keptTotal = lines.filter(editableLine).reduce((n, i) => n + Number(i.price) * Math.min(qty[i.id] ?? 0, paid ? i.quantity : 999), 0);
  const extraTotal = paid ? lines.filter(editableLine).reduce((n, i) => n + Number(i.price) * Math.max(0, (qty[i.id] ?? 0) - i.quantity), 0) + addedTotal : 0;
  const subtotal = fixedTotal + keptTotal + (paid ? 0 : addedTotal);
  // The promo code priced as the server will: only on what it's for (and delivery, if it covers it).
  const after = [
    ...lines.filter((i) => !editableLine(i)),
    ...lines.filter(editableLine).map((i) => ({ ...i, quantity: Math.min(qty[i.id] ?? 0, paid ? i.quantity : 999) })),
    ...(paid ? [] : added.map((a) => ({ price: unit(a.product), quantity: a.quantity, productId: a.product.id }))),
  ];
  const off = order.coupon ? promoDiscount(order.coupon, after, Number(order.deliveryCost), order.isGift) : null;
  const discount = off ? off.items + off.delivery : Math.min(Number(order.discountAmount), subtotal);
  const total = off
    ? Math.max(0, subtotal - off.items) + Number(order.deliveryCost) - off.delivery
    : Math.max(0, subtotal - discount) + Number(order.deliveryCost);
  const diff = +(total - Number(order.total)).toFixed(2);
  const itemsChanged = lines.some((i) => editableLine(i) && qty[i.id] !== i.quantity) || added.length > 0;
  const nothingLeft = !lines.some((i) => !editableLine(i)) && !lines.some((i) => editableLine(i) && (qty[i.id] ?? 0) > 0) && !added.length;
  const moneyLine = [
    diff < 0 && paid ? `Refund due ${money(-diff)}` : null,
    diff !== 0 && !paid ? `New total ${money(total)} (${diff > 0 ? '+' : '−'}${money(Math.abs(diff))})` : null,
    extraTotal > 0 ? `Extra payment ${money(extraTotal)} — the customer gets a link to pay` : null,
  ].filter(Boolean).join(' · ');

  function add(p: any) {
    // Already on the order (and not personalised): one more of that line.
    const same = lines.find((i: any) => editableLine(i) && i.productId === p.id && !i.personalisation);
    if (same) { setQty((x) => ({ ...x, [same.id]: (x[same.id] ?? 0) + 1 })); return; }
    setAdded((a) => (a.some((x) => x.product.id === p.id) ? a.map((x) => (x.product.id === p.id ? { ...x, quantity: x.quantity + 1 } : x)) : [...a, { product: p, quantity: 1 }]));
  }

  function openReview() {
    setError('');
    if (nothingLeft) { setError('An order needs at least one item. To drop everything, cancel the order instead.'); return; }
    if (newAddr && ['firstName', 'lastName', 'phone', 'city', 'addressLine1'].some((k) => !String(newAddr[k] || '').trim())) {
      setError('The new address needs a name, phone, city and street.'); return;
    }
    setReview(true);
  }

  async function save() {
    setSaving(true); setError('');
    const body: any = { addressForPlan, dogId: dogId || null, reason: reason.trim() || undefined };
    if (newAddr) { body.address = newAddr; body.newAddress = true; }
    else if (addressId && addressId !== order.addressId) body.addressId = addressId;
    if (itemsChanged) body.items = [...lines.filter(editableLine).map((i) => ({ id: i.id, quantity: qty[i.id] ?? 0 })), ...added.map((a) => ({ productId: a.product.id, quantity: a.quantity }))];
    if (order.isGift) { body.giftRecipientName = gift.name; body.giftMessage = gift.message; }
    const r = await fetch(`${API}/orders/admin/${orderId}`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setSaving(false); setReview(false);
    if (!r.ok) { setError(apiError(d)); return; }
    onDone(d, `Saved ${changes.length} change${changes.length === 1 ? '' : 's'}${extraTotal > 0 ? ' · extra payment sent' : ''}`);
  }

  const stepper = (value: number, on: (n: number) => void, label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', border: '1.5px solid var(--slate-200)', borderRadius: 99, background: 'var(--white)', flexShrink: 0 }}>
      <button type="button" aria-label={`One less ${label}`} onClick={() => on(value - 1)} style={stepBtn}>−</button>
      <span style={{ minWidth: 22, textAlign: 'center', fontSize: 13.5, fontWeight: 800 }}>{value}</span>
      <button type="button" aria-label={`One more ${label}`} onClick={() => on(value + 1)} style={stepBtn}>+</button>
    </span>
  );
  // One card per distinct address (older checkouts saved copies); the order's own one wins.
  const key = (a: any) => [a.firstName, a.lastName, a.phone, a.city, a.addressLine1, a.addressLine2 || ''].join('|').toLowerCase();
  const addrs = [...(order.user?.addresses ?? [])]
    .sort((a, b) => Number(b.id === order.addressId) - Number(a.id === order.addressId))
    .filter((a, i, all) => all.findIndex((x) => key(x) === key(a)) === i);
  const pill = (on: boolean) => ({ border: `2px solid ${on ? 'var(--teal-500)' : 'var(--slate-200)'}`, background: on ? 'var(--teal-50)' : 'var(--white)', cursor: 'pointer', fontFamily: 'inherit' } as const);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Section n={1} title="What’s in it" hint={paid ? 'Paid: take things off (→ refund due) or add more (→ an extra payment the customer pays by link).' : 'Unpaid: add, change or take off anything — the amount to pay follows.'}>
        <div style={{ display: 'grid', gap: 10 }}>
          {lines.map((i) => {
            const editable = editableLine(i);
            const n = editable ? qty[i.id] ?? 0 : i.quantity;
            return (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: n === 0 ? 0.45 : 1 }}>
                <Thumb item={i} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--slate-800)', textDecoration: n === 0 ? 'line-through' : 'none' }}>{i.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--slate-400)' }}>
                    {money(i.price)} each{!editable && ` · 🔒 ${i.subscriptionPlanId ? 'plan' : i.customBoxId ? 'built box' : 'paid to seller'}`}
                    {editable && paid && n > i.quantity && <span style={{ color: 'var(--amber-700)', fontWeight: 700 }}> · +{n - i.quantity} on an extra payment</span>}
                  </p>
                </div>
                {editable ? (
                  <>
                    {stepper(n, (v) => setQty((x) => ({ ...x, [i.id]: Math.max(0, Math.min(999, v)) })), i.name)}
                    <button type="button" aria-label={n === 0 ? `Put back ${i.name}` : `Remove ${i.name}`} title={n === 0 ? 'Put back' : 'Remove'} onClick={() => setQty((x) => ({ ...x, [i.id]: n === 0 ? i.quantity : 0 }))}
                      style={{ ...stepBtn, width: 32, height: 32, borderRadius: 9, border: '1.5px solid var(--slate-200)', color: n === 0 ? 'var(--teal-700)' : 'var(--red-600)', fontSize: 12, flexShrink: 0 }}>{n === 0 ? '↺' : '✕'}</button>
                  </>
                ) : <span style={{ fontSize: 12.5, color: 'var(--slate-500)' }}>×{i.quantity}</span>}
              </div>
            );
          })}
          {added.map((a) => (
            <div key={a.product.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Thumb item={{ product: a.product }} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--slate-800)' }}>{a.product.name}{' '}
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: paid ? 'var(--amber-700)' : 'var(--teal-700)', background: paid ? 'var(--amber-50)' : 'var(--teal-50)', borderRadius: 99, padding: '1px 7px', whiteSpace: 'nowrap' }}>{paid ? 'extra payment' : 'new'}</span>
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--slate-400)' }}>{money(unit(a.product))} each</p>
              </div>
              {stepper(a.quantity, (v) => setAdded((x) => (v <= 0 ? x.filter((y) => y.product.id !== a.product.id) : x.map((y) => (y.product.id === a.product.id ? { ...y, quantity: Math.min(999, v) } : y)))), a.product.name)}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--slate-200)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 800, color: 'var(--slate-700)' }}>+ Add a product</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <CategoryPicker categories={categories} value={cat} onChange={setCat} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" aria-label="Search products" style={{ ...input, flex: '1 1 160px', width: 'auto' }} />
          </div>
          {found.length > 0 && (
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {found.map((p) => (
                <button key={p.id} type="button" onClick={() => add(p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 12, border: '1.5px solid var(--slate-200)', background: 'var(--white)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <Thumb item={{ product: p }} size={32} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--slate-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--teal-700)', fontWeight: 800 }}>+ {money(unit(p))}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {(slug || q.trim().length >= 2) && found.length === 0 && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--slate-400)' }}>No products found.</p>}
        </div>
      </Section>

      <Section n={2} title={order.isGift ? 'Where it goes (the gift recipient)' : 'Where it goes'} hint="One of the customer’s addresses, or a new one — a new one is saved to their account too.">
        <div role="radiogroup" aria-label="Delivery address" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: 8 }}>
          {!addrs.some((a) => a.id === order.addressId) && order.address && (
            <button type="button" role="radio" aria-checked={!newAddr && addressId === order.addressId} onClick={() => { setNewAddr(null); setAddressId(order.addressId); }}
              style={{ ...pill(!newAddr && addressId === order.addressId), textAlign: 'left', padding: '11px 12px', borderRadius: 14 }}>
              <AddrCard a={order.address} on={!newAddr && addressId === order.addressId} note="this order’s address" />
            </button>
          )}
          {addrs.map((a) => {
            const on = !newAddr && addressId === a.id;
            return (
              <button key={a.id} type="button" role="radio" aria-checked={on} onClick={() => { setNewAddr(null); setAddressId(a.id); }}
                style={{ ...pill(on), textAlign: 'left', padding: '11px 12px', borderRadius: 14 }}>
                <AddrCard a={a} on={on} note={a.id === order.addressId ? 'current' : a.isDefault ? 'default' : ''} />
              </button>
            );
          })}
          <button type="button" role="radio" aria-checked={!!newAddr}
            onClick={() => setNewAddr(newAddr ?? { ...EMPTY_ADDR, firstName: order.address?.firstName ?? order.user?.firstName ?? '', lastName: order.address?.lastName ?? order.user?.lastName ?? '', phone: order.address?.phone ?? order.user?.phone ?? '' })}
            style={{ ...pill(!!newAddr), borderStyle: newAddr ? 'solid' : 'dashed', padding: '11px 12px', borderRadius: 14, fontSize: 13, fontWeight: 800, color: 'var(--teal-700)', minHeight: 64 }}>
            {newAddr ? '✓ New address' : '+ New address'}
          </button>
        </div>
        {newAddr && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {([['firstName', 'First name'], ['lastName', 'Last name'], ['phone', 'Phone'], ['city', 'City'], ['addressLine1', 'Street and number'], ['addressLine2', 'Flat, floor, entrance'], ['postalCode', 'Postcode']] as const).map(([k, l]) => (
              <label key={k} style={{ display: 'grid', gap: 4, fontSize: 11.5, fontWeight: 700, color: 'var(--slate-600)', gridColumn: k === 'addressLine1' ? '1 / -1' : undefined }}>
                {l}<input value={newAddr[k] ?? ''} onChange={(e) => setNewAddr((a: any) => ({ ...a, [k]: e.target.value }))} style={input} />
              </label>
            ))}
            <button type="button" onClick={() => setNewAddr(null)} style={{ justifySelf: 'start', border: 'none', background: 'none', color: 'var(--slate-500)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>Don’t add a new address</button>
          </div>
        )}
        {order.subscription && (newAddr || addressId !== order.addressId) && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: 12.5, color: 'var(--slate-700)' }}>
            <input type="checkbox" checked={addressForPlan} onChange={(e) => setAddressForPlan(e.target.checked)} /> Send the plan’s next boxes here too
          </label>
        )}
      </Section>

      <Section n={3} title="Which dog" hint="The box is picked for this dog — size and allergies.">
        <div role="radiogroup" aria-label="Dog" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[{ id: '', name: 'No dog' }, ...dogs].map((d: any) => {
            const on = dogId === d.id;
            return (
              <button key={d.id || 'none'} type="button" role="radio" aria-checked={on} onClick={() => setDogId(d.id)}
                style={{ ...pill(on), display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 5px', borderRadius: 99, minHeight: 44 }}>
                <span style={{ width: 30, height: 30, borderRadius: 99, overflow: 'hidden', background: 'var(--slate-100)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {d.photoUrl ? <img src={d.photoUrl} alt="" style={{ width: 30, height: 30, objectFit: 'cover' }} /> : d.id ? '🐶' : '—'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-800)' }}>
                  {d.name}{d.size && <span style={{ color: 'var(--slate-400)', fontWeight: 600 }}> · {SIZE[d.size] ?? d.size}</span>}{d.gift && <span style={{ color: 'var(--slate-400)', fontWeight: 600 }}> · gift</span>}
                </span>
                {d.allergies?.length > 0 && <span title={`Allergies: ${d.allergies.join(', ')}`} aria-label="Has allergies" style={{ color: 'var(--red-600)', fontSize: 12 }}>⚠</span>}
              </button>
            );
          })}
        </div>
      </Section>

      {order.isGift && (
        <Section n={4} title="Gift card" hint="Who it’s for and what the card says.">
          <div style={{ display: 'grid', gap: 10 }}>
            <input value={gift.name} onChange={(e) => setGift((g) => ({ ...g, name: e.target.value }))} placeholder="Recipient’s name" aria-label="Recipient’s name" style={input} />
            <textarea value={gift.message} onChange={(e) => setGift((g) => ({ ...g, message: e.target.value }))} rows={3} placeholder="Message on the card" aria-label="Message on the card" style={{ ...input, resize: 'vertical' }} />
          </div>
        </Section>
      )}

      {error && <p role="alert" style={{ margin: 0, fontSize: 12.5, color: 'var(--red-600)', background: 'var(--red-50)', border: '1px solid var(--red-200)', borderRadius: 11, padding: '9px 12px' }}>{error}</p>}

      {/* The bar: how many changes, what they do to the money, Review */}
      <div style={{ position: 'sticky', bottom: 0, zIndex: 3, padding: 12, borderRadius: 16, background: 'var(--white)', border: '1px solid var(--slate-200b)', boxShadow: '0 -8px 24px -16px rgba(15,23,42,.35)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--slate-900)' }}>{dirty ? `${changes.length} change${changes.length === 1 ? '' : 's'}` : 'No changes yet'}</div>
          <div style={{ fontSize: 12, color: moneyLine ? 'var(--amber-700)' : 'var(--slate-400)' }}>{moneyLine || `Total stays ${money(order.total)}`}</div>
        </div>
        <button type="button" onClick={() => { if (!dirty || confirm('Discard your changes to this order?')) onCancel(); }} style={{ padding: '10px 16px', borderRadius: 11, border: '1.5px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-700)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
        <button type="button" disabled={!dirty || saving} onClick={openReview}
          style={{ padding: '10px 18px', borderRadius: 11, border: 'none', background: 'var(--teal-600)', color: 'var(--white)', fontSize: 13.5, fontWeight: 800, cursor: dirty ? 'pointer' : 'default', opacity: dirty ? 1 : 0.5 }}>Review changes</button>
      </div>

      <ConfirmSheet open={review} title={`Save ${changes.length} change${changes.length === 1 ? '' : 's'}?`} confirmLabel="Save changes" busy={saving} onClose={() => setReview(false)} onConfirm={save}>
        <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          {changes.map((c, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) 2fr', gap: 8, fontSize: 12.5, padding: '8px 10px', borderRadius: 10, background: 'var(--slate-50)' }}>
              <strong style={{ color: 'var(--slate-800)' }}>{c.what}</strong>
              <span><span style={{ color: 'var(--slate-400)', textDecoration: 'line-through' }}>{c.from}</span> → <strong style={{ color: 'var(--teal-800)' }}>{c.to}</strong></span>
            </div>
          ))}
        </div>
        {moneyLine && <p style={{ margin: '0 0 10px', fontWeight: 700, color: 'var(--amber-700)' }}>{moneyLine}</p>}
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why? e.g. customer called (kept on the order)" aria-label="Reason" style={input} />
      </ConfirmSheet>
    </div>
  );
}

function Section({ n, title, hint, children }: { n: number; title: string; hint: string; children: ReactNode }) {
  return (
    <section style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 18, padding: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ width: 24, height: 24, borderRadius: 99, background: 'var(--teal-600)', color: 'var(--white)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{n}</span>
        <div style={{ flex: 1, minWidth: 0 }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--slate-900)' }}>{title}</h3><p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--slate-500)' }}>{hint}</p></div>
      </div>
      {children}
    </section>
  );
}

function AddrCard({ a, on, note }: { a: any; on: boolean; note: string }) {
  return (
    <>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        <strong style={{ fontSize: 13, color: 'var(--slate-900)' }}>{a.isGift ? '🎁' : '📍'} {a.city || '—'}</strong>
        {on ? <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--teal-700)' }}>✓</span> : note && <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>{note}</span>}
      </span>
      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--slate-600)', marginTop: 2 }}>{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}</span>
      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--slate-400)' }}>{[`${a.firstName ?? ''} ${a.lastName ?? ''}`.trim(), a.phone].filter(Boolean).join(' · ')}</span>
      {a.isGift && <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 700, color: 'var(--violet-700)', background: 'var(--violet-50)', borderRadius: 99, padding: '1px 7px' }}>{(a.label || 'Gift').replace(/^Gift · /, 'Gift for ')}</span>}
    </>
  );
}

/** A shop product line this screen may change (not a plan, built box or paid-out seller line). */
const editableLine = (i: any) => !!i.productId && !i.customBoxId && !i.payoutId;
const stepBtn = { width: 30, height: 30, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--slate-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } as const;
const input = { border: '1.5px solid var(--slate-200)', borderRadius: 11, padding: '9px 12px', fontSize: 13.5, outline: 'none', background: 'var(--white)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', color: 'var(--slate-900)' } as const;

/** Same as the API's couponDiscount: off what the code is for; a fixed amount is shared, items first, then delivery. */
function promoDiscount(c: any, lines: any[], delivery: number, gift: boolean) {
  const value = (l: any) => Number(l.price) * l.quantity;
  if (c.minOrderAmount && lines.reduce((n, l) => n + value(l), 0) < Number(c.minOrderAmount)) return { items: 0, delivery: 0 };
  const scope = (l: any) => (l.customBoxId ? 'CUSTOM_BOX' : l.subscriptionPlanId ? (gift ? 'GIFT' : 'BOX') : 'SHOP');
  const scopes: string[] = c.scopes ?? [];
  const eligible = lines.filter((l) => scopes.includes(scope(l))).reduce((n, l) => n + value(l), 0);
  const fee = scopes.includes('DELIVERY') ? Math.max(0, delivery) : 0;
  if (c.discountType === 'PERCENTAGE') { const p = Number(c.discountValue) / 100; return { items: +(eligible * p).toFixed(2), delivery: +(fee * p).toFixed(2) }; }
  const items = Math.min(Number(c.discountValue), eligible);
  return { items: +items.toFixed(2), delivery: +Math.min(Number(c.discountValue) - items, fee).toFixed(2) };
}
