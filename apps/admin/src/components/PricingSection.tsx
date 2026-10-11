'use client';
import { useState, useEffect, useRef } from 'react';
import FormField, { inputClass } from './FormField';

interface Props {
  price: string;
  salePrice: string;
  onChange: (price: string, salePrice: string) => void;
  priceError?: string;
  salePriceError?: string;
  /** A seller's product: the price is worked out from their price + our margin. */
  priceLocked?: boolean;
}

export default function PricingSection({ price, salePrice, onChange, priceError, salePriceError, priceLocked = false }: Props) {
  const [discountPct, setDiscountPct] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  // Prevents useEffect from overwriting discount fields while the user is typing in them
  const userTypingDiscount = useRef(false);

  // Only sync discount fields from parent values (initial load / external price change)
  useEffect(() => {
    if (userTypingDiscount.current) return;
    const p = parseFloat(price);
    const s = parseFloat(salePrice);
    if (p > 0 && s > 0 && s < p) {
      setDiscountAmt((p - s).toFixed(2));
      setDiscountPct((((p - s) / p) * 100).toFixed(1));
    } else if (!salePrice) {
      setDiscountAmt('');
      setDiscountPct('');
    }
  }, [price, salePrice]);

  function handlePrice(val: string) {
    const p = parseFloat(val);
    if (discountPct && p > 0) {
      const s = (p * (1 - parseFloat(discountPct) / 100)).toFixed(2);
      onChange(val, s);
    } else if (discountAmt && p > 0) {
      const s = (p - parseFloat(discountAmt)).toFixed(2);
      onChange(val, s > '0' ? s : '');
    } else {
      onChange(val, salePrice);
    }
  }

  function handleSalePrice(val: string) {
    userTypingDiscount.current = false;
    const p = parseFloat(price);
    const s = parseFloat(val);
    onChange(price, val);
    if (p > 0 && s > 0 && s < p) {
      setDiscountAmt((p - s).toFixed(2));
      setDiscountPct((((p - s) / p) * 100).toFixed(1));
    } else {
      setDiscountAmt('');
      setDiscountPct('');
    }
  }

  function handleDiscountPct(val: string) {
    userTypingDiscount.current = true;
    setDiscountPct(val);
    setDiscountAmt('');
    const p = parseFloat(price);
    const pct = parseFloat(val);
    if (p > 0 && pct > 0 && pct < 100) {
      const s = (p * (1 - pct / 100)).toFixed(2);
      const amt = (p - parseFloat(s)).toFixed(2);
      setDiscountAmt(amt);
      onChange(price, s);
    } else if (!val) {
      onChange(price, '');
    }
  }

  function handleDiscountAmt(val: string) {
    userTypingDiscount.current = true;
    setDiscountAmt(val);
    setDiscountPct('');
    const p = parseFloat(price);
    const amt = parseFloat(val);
    if (p > 0 && amt > 0 && amt < p) {
      const s = (p - amt).toFixed(2);
      const pct = (((p - parseFloat(s)) / p) * 100).toFixed(1);
      setDiscountPct(pct);
      onChange(price, s);
    } else if (!val) {
      onChange(price, '');
    }
  }

  const p = parseFloat(price) || 0;
  const s = parseFloat(salePrice) || 0;
  const hasDiscount = s > 0 && s < p;
  const saving = hasDiscount ? (p - s).toFixed(2) : null;
  const savingPct = hasDiscount ? (((p - s) / p) * 100).toFixed(1) : null;

  const inp = (err?: string) => ({
    ...inputClass(err),
    width: '100%',
    boxSizing: 'border-box' as const,
  });

  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <FormField label={priceLocked ? 'Shop price (₾) · from the seller’s price + our margin' : 'RRP / Original Price (₾)'} required error={priceError}>
          <input style={{ ...inp(priceError), ...(priceLocked ? { background: 'var(--slate-50)', color: 'var(--slate-600)', fontWeight: 700 } : {}) }} type="number" step="0.01" min="0" value={price}
            readOnly={priceLocked} onChange={e => !priceLocked && handlePrice(e.target.value)} placeholder="0.00" />
        </FormField>
        <FormField label="Customer Price (₾)" error={salePriceError}>
          <input style={inp(salePriceError)} type="number" step="0.01" min="0" value={salePrice} onChange={e => handleSalePrice(e.target.value)} placeholder="Leave empty = no discount" />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Discount % <span style={{ color: 'var(--slate-300)', fontWeight: 400 }}>(auto-fills Customer Price)</span></label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inp(), paddingRight: 32 }}
              type="number" step="0.1" min="0" max="99"
              value={discountPct}
              onChange={e => handleDiscountPct(e.target.value)}
              placeholder="e.g. 20"
            />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', fontSize: 13, pointerEvents: 'none' }}>%</span>
          </div>
        </div>
        <div>
          <label style={lbl}>Discount Amount (₾) <span style={{ color: 'var(--slate-300)', fontWeight: 400 }}>(auto-fills Customer Price)</span></label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inp(), paddingLeft: 24 }}
              type="number" step="0.01" min="0"
              value={discountAmt}
              onChange={e => handleDiscountAmt(e.target.value)}
              placeholder="e.g. 5.00"
            />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', fontSize: 13, pointerEvents: 'none' }}>₾</span>
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ background: hasDiscount ? 'var(--teal-50)' : 'var(--slate-50)', border: `1px solid ${hasDiscount ? 'var(--teal-200)' : 'var(--slate-200)'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, display: 'block', marginBottom: 2 }}>RRP</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-800)', textDecoration: hasDiscount ? 'line-through' : 'none' }}>₾{p > 0 ? p.toFixed(2) : '—'}</span>
        </div>
        {hasDiscount && (
          <>
            <div style={{ color: 'var(--slate-400)', fontSize: 18 }}>→</div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--teal-600)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Customer Pays</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--teal-600)' }}>₾{s.toFixed(2)}</span>
            </div>
            <div style={{ background: 'var(--teal-600)', color: 'var(--white)', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
              -{savingPct}%
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--slate-500)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Customer Saves</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-500)' }}>₾{saving}</span>
            </div>
          </>
        )}
        {!hasDiscount && p > 0 && (
          <span style={{ fontSize: 13, color: 'var(--slate-400)' }}>No discount — customer pays full RRP</span>
        )}
        {p === 0 && (
          <span style={{ fontSize: 13, color: 'var(--slate-300)' }}>Enter RRP to see pricing summary</span>
        )}
      </div>
    </div>
  );
}
