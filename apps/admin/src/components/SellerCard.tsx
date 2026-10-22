'use client';
import { Select } from '@/components/Dropdown';
import { useEffect, useState } from 'react';
import { NumInput } from '@/components/NumberField';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export type SellerTerms = { sellerId: string; sellerPrice: string; marginType: 'FIXED' | 'PERCENT'; marginValue: string };
export const OURS: SellerTerms = { sellerId: '', sellerPrice: '', marginType: 'FIXED', marginValue: '' };

export const termsFromProduct = (p: any): SellerTerms => p?.sellerId ? {
  sellerId: p.sellerId,
  sellerPrice: p.supply?.sellerPrice != null ? String(p.supply.sellerPrice) : '',
  marginType: p.supply?.marginType ?? 'FIXED',
  marginValue: p.supply?.marginValue != null ? String(p.supply.marginValue) : '',
} : OURS;

/** Same sum the server does: seller's price + our margin, to the tetri. */
export function shopPrice(t: SellerTerms): number | null {
  const sp = parseFloat(t.sellerPrice);
  if (!t.sellerId || !(sp > 0)) return null;
  const m = Math.max(0, parseFloat(t.marginValue) || 0);
  return Math.round((t.marginType === 'PERCENT' ? sp * (1 + m / 100) : sp + m) * 100) / 100;
}

/** What the request should carry for the seller fields. */
export const termsPayload = (t: SellerTerms) => t.sellerId
  ? { sellerId: t.sellerId, sellerPrice: Number(t.sellerPrice), marginType: t.marginType, marginValue: Number(t.marginValue || 0) }
  : { sellerId: null };

/**
 * Who sells the product: us, or a seller. For a seller, their price and the
 * margin we add (₾ or %) give the shop price, shown with what each side
 * gets — including when a sale price would eat into the margin.
 */
export default function SellerCard({ value, onChange, salePrice, error, style }: {
  value: SellerTerms; onChange: (v: SellerTerms) => void; salePrice?: string; error?: string; style?: React.CSSProperties;
}) {
  const [sellers, setSellers] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/sellers`, { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } })
      .then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setSellers(d)).catch(() => {});
  }, []);

  const set = (k: keyof SellerTerms, v: string) => onChange({ ...value, [k]: v });
  const final = shopPrice(value);
  const sp = parseFloat(value.sellerPrice) || 0;
  const sale = parseFloat(salePrice || '') || 0;
  const charged = sale > 0 && final != null && sale < final ? sale : final;
  const ourCut = charged != null ? Math.round((charged - sp) * 100) / 100 : null;

  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: `1px solid ${error ? 'var(--red-300)' : 'var(--slate-200)'}`, borderRadius: 9, padding: '8px 12px', fontSize: 13, background: 'var(--white)', color: 'var(--slate-900)' };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 };
  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, padding: '7px 0', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: on ? 'var(--white)' : 'transparent', color: on ? 'var(--teal-700, #0f766e)' : 'var(--slate-500)' });

  return (
    <div style={style}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>Sold by</p>
      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '0 0 14px' }}>Our own product, or one we sell for a seller. For a seller, the shop price is their price plus our margin. Their price and our margin are never shown on the site.</p>
      <Select value={value.sellerId} onChange={(e) => onChange(e.target.value ? { ...value, sellerId: e.target.value } : OURS)} style={{ ...input, maxWidth: 360 }}>
        <option value="">Pupbox (our own product)</option>
        {sellers.filter((s) => s.isActive || s.id === value.sellerId).map((s) => <option key={s.id} value={s.id}>{s.name}{s.isActive ? '' : ' (off)'}</option>)}
      </Select>
      {sellers.length === 0 && <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '8px 0 0' }}>No sellers yet — add them in Sellers.</p>}

      {value.sellerId && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
            <div>
              <label style={lbl}>Seller’s price (₾) *</label>
              <NumInput style={input} step="0.01" min="0" value={value.sellerPrice} onChange={(e) => set('sellerPrice', e.target.value)} placeholder="What they charge us" />
            </div>
            <div>
              <label style={lbl}>Our margin</label>
              <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, background: 'var(--slate-100)' }}>
                <button type="button" onClick={() => set('marginType', 'FIXED')} style={seg(value.marginType === 'FIXED')}>₾ amount</button>
                <button type="button" onClick={() => set('marginType', 'PERCENT')} style={seg(value.marginType === 'PERCENT')}>% of price</button>
              </div>
            </div>
            <div>
              <label style={lbl}>{value.marginType === 'PERCENT' ? 'Margin (%)' : 'Margin (₾)'}</label>
              <NumInput style={input} step="0.01" min="0" value={value.marginValue} onChange={(e) => set('marginValue', e.target.value)} placeholder="0" />
            </div>
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--red-600)', margin: '8px 0 0' }}>{error}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            {[
              ['Seller gets', sp > 0 ? `₾${sp.toFixed(2)}` : '—', 'var(--slate-700)'],
              ['We keep', ourCut != null ? `₾${ourCut.toFixed(2)}` : '—', ourCut != null && ourCut < 0 ? 'var(--red-600)' : 'var(--teal-700, #0f766e)'],
              ['Shop price', final != null ? `₾${final.toFixed(2)}` : '—', 'var(--slate-900)'],
            ].map(([k, v, c]) => (
              <div key={k} style={{ flex: '1 1 140px', padding: '10px 14px', borderRadius: 12, background: 'var(--slate-50)' }}>
                <div style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600 }}>{k}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          {sale > 0 && final != null && sale < final && (
            <p style={{ fontSize: 12, margin: '10px 0 0', color: ourCut != null && ourCut < 0 ? 'var(--red-600)' : 'var(--slate-500)' }}>
              {ourCut != null && ourCut < 0
                ? `The sale price (₾${sale.toFixed(2)}) is below the seller’s price — we would lose ₾${Math.abs(ourCut).toFixed(2)} on each one.`
                : `With the sale price (₾${sale.toFixed(2)}) we keep ₾${ourCut?.toFixed(2)} on each one.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
