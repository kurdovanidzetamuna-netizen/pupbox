'use client';
import { useEffect, useMemo, useState } from 'react';
import { API, jsonHeaders, money, apiError, Thumb } from '../_lib';

type Mode = 'FULL' | 'ITEMS' | 'AMOUNT';

/**
 * Give money back, all of it or part. Three ways: everything left, chosen
 * items (priced as paid — an order discount is shared out — with "put back
 * in stock"), or an amount (goodwill, a late delivery). Then how: through
 * the payment provider, or "already done in Flitt's portal, just record it".
 * A summary line says exactly what will happen before the button does it.
 */
export default function RefundModal({ order, onClose, onDone }: { order: any; onClose: () => void; onDone: (o: any, text: string) => void }) {
  const payment = order.payments?.find((p: any) => ['PAID', 'PARTIALLY_REFUNDED'].includes(p.status));
  const already = (payment?.refunds ?? []).reduce((n: number, r: any) => n + Number(r.amount), 0);
  const left = Math.max(0, Number(payment?.amount ?? 0) - already);
  const shipped = ['SHIPPED', 'DELIVERED'].includes(order.status);
  const unshippedOpen = ['PAID', 'PROCESSING', 'PACKED'].includes(order.status);
  const lines = (order.items ?? []) as any[];
  const share = 1 - Math.min(Number(order.discountAmount || 0), Number(order.subtotal) || 1) / (Number(order.subtotal) || 1);

  const [mode, setMode] = useState<Mode>('FULL');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(!shipped);
  const [recordOnly, setRecordOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', esc, true);
    return () => window.removeEventListener('keydown', esc, true);
  }, [onClose]);

  const itemsTotal = useMemo(() => +lines.reduce((n, l) => n + Number(l.price) * (qty[l.id] ?? 0) * share, 0).toFixed(2), [qty, lines, share]);
  const value = mode === 'FULL' ? left : mode === 'ITEMS' ? Math.min(itemsTotal, left) : Number(amount.replace(',', '.')) || 0;
  const valid = value > 0 && value <= left + 0.001;
  const card = payment?.cardMask ? `${payment.cardBrand ?? 'card'} ••${String(payment.cardMask).slice(-4)}` : 'the original card';
  const viaProvider = !recordOnly && payment && payment.provider !== 'MANUAL';
  const effect = mode === 'FULL' && unshippedOpen
    ? 'The order is cancelled: nothing ships, all items go back in stock and any plan it started stops.'
    : mode === 'ITEMS' && !shipped
      ? `Those items come off the order so they aren’t packed${restock ? ' and go back in stock' : ''}.`
      : mode === 'ITEMS' && restock ? 'Those items go back in stock (returned unopened).' : 'The order itself stays as it is.';

  async function submit() {
    setBusy(true); setError('');
    const body: any = { mode, reason: reason.trim() || undefined, restock: mode !== 'AMOUNT' && restock, recordOnly };
    if (mode === 'AMOUNT') body.amount = value;
    if (mode === 'ITEMS') body.items = Object.entries(qty).filter(([, q]) => q > 0).map(([itemId, quantity]) => ({ itemId, quantity }));
    const r = await fetch(`${API}/orders/admin/${order.id}/refunds`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(apiError(d, 'Refund failed.')); return; }
    onDone(d, `Refunded ${money(value)}`);
  }

  const tab = (m: Mode, label: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(''); }}
      style={{ flex: 1, padding: '9px 8px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: mode === m ? 'var(--white)' : 'transparent', color: mode === m ? 'var(--slate-900)' : 'var(--slate-500)', boxShadow: mode === m ? '0 1px 4px rgba(15,23,42,.12)' : 'none' }}>{label}</button>
  );
  const box = { border: '1.5px solid var(--slate-200)', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, outline: 'none', width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit' };

  return (
    <div role="dialog" aria-modal="true" aria-label="Refund" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 75, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="cs-card" style={{ width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto', background: 'var(--white)', borderRadius: 20, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Refund</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--slate-200)', background: 'var(--white)', cursor: 'pointer' }}>✕</button>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--slate-500)' }}>Paid {money(payment?.amount)}{already > 0 ? ` · already refunded ${money(already)}` : ''} · <strong style={{ color: 'var(--slate-800)' }}>{money(left)} can be refunded</strong></p>

        <div role="tablist" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 13, background: 'var(--slate-100)', marginBottom: 14 }}>
          {tab('FULL', 'Everything')}{tab('ITEMS', 'Chosen items')}{tab('AMOUNT', 'An amount')}
        </div>

        {mode === 'ITEMS' && (
          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            {lines.map((l) => {
              const q = qty[l.id] ?? 0;
              return (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, border: `1.5px solid ${q ? 'var(--teal-300)' : 'var(--slate-200)'}`, background: q ? 'var(--teal-50)' : 'var(--white)' }}>
                  <Thumb item={l} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--slate-800)' }}>{l.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--slate-500)' }}>{l.quantity} × {money(Number(l.price) * share)}{share < 1 ? ' (after discount)' : ''}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--slate-200)', borderRadius: 99, background: 'var(--white)' }}>
                    <button type="button" aria-label={`One less ${l.name}`} onClick={() => setQty((x) => ({ ...x, [l.id]: Math.max(0, q - 1) }))} style={step}>−</button>
                    <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 800, fontSize: 13 }}>{q}</span>
                    <button type="button" aria-label={`One more ${l.name}`} disabled={q >= l.quantity} onClick={() => setQty((x) => ({ ...x, [l.id]: Math.min(l.quantity, q + 1) }))} style={{ ...step, opacity: q >= l.quantity ? 0.35 : 1 }}>+</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {mode === 'AMOUNT' && (
          <label style={{ display: 'grid', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--slate-600)', marginBottom: 12 }}>Amount (₾)
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder={`up to ${left.toFixed(2)}`} style={box} autoFocus />
          </label>
        )}

        {mode !== 'AMOUNT' && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--slate-700)', marginBottom: 10 }}>
            <input type="checkbox" checked={mode === 'FULL' && unshippedOpen ? true : restock} disabled={mode === 'FULL' && unshippedOpen} onChange={(e) => setRestock(e.target.checked)} />
            Put the items back in stock{shipped ? ' (they came back unopened)' : ''}
          </label>
        )}
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (kept on the order, e.g. damaged in delivery)" style={{ ...box, marginBottom: 10 }} />
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--slate-600)', marginBottom: 14 }}>
          <input type="checkbox" checked={recordOnly} onChange={(e) => setRecordOnly(e.target.checked)} style={{ marginTop: 2 }} />
          <span>I already refunded it in Flitt’s portal — only record it here</span>
        </label>

        <div style={{ borderRadius: 14, padding: '12px 14px', background: valid ? 'var(--red-50)' : 'var(--slate-50)', border: `1px solid ${valid ? 'var(--red-200)' : 'var(--slate-200)'}`, fontSize: 13, color: 'var(--slate-700)', lineHeight: 1.5 }}>
          <strong style={{ fontSize: 15, color: valid ? 'var(--red-700)' : 'var(--slate-500)' }}>{valid ? `Refund ${money(value)}` : 'Choose what to refund'}</strong>
          {valid && <> {viaProvider ? `back to ${card}` : '(recorded only)'}. {effect} The customer gets a text{viaProvider ? '; banks take 3–5 working days' : ''}.</>}
        </div>
        {error && <p role="alert" style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--red-600)' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: 11, border: '1.5px solid var(--slate-200)', background: 'var(--white)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={submit} disabled={!valid || busy}
            style={{ padding: '10px 18px', borderRadius: 11, border: 'none', background: 'var(--red-600)', color: 'var(--white)', fontSize: 13.5, fontWeight: 800, cursor: valid && !busy ? 'pointer' : 'default', opacity: valid && !busy ? 1 : 0.5 }}>
            {busy ? 'Refunding…' : valid ? `Refund ${money(value)}` : 'Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}

const step = { width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: 'var(--slate-600)' } as const;
