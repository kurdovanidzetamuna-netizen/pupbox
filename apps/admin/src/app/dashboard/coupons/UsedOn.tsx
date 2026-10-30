'use client';
import { useEffect, useState } from 'react';
import CustomerDrawer from '@/components/CustomerDrawer';
import { download, getOr } from '@/lib/api';
import { gel } from '@/lib/format';

const when = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Who used a promo code: every order it was on, newest first — customer,
 * date, what it took off, and whether the order was paid. Tapping a name
 * opens that customer.
 */
export default function UsedOn({ id, code }: { id: string; code: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [all, setAll] = useState(false);
  const [who, setWho] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    getOr<any>(`/admin/coupons/${id}/orders`, { orders: [] }).then((d) => setRows(d.orders ?? []));
  }, [id]);

  if (!rows) return <p style={{ fontSize: 12.5, color: 'var(--slate-400)', margin: '4px 0 12px' }}>Loading who used it…</p>;
  const shown = all ? rows : rows.slice(0, 8);
  return (
    <div style={{ border: '1px solid var(--slate-200b)', borderRadius: 14, padding: '12px 14px', margin: '4px 0 12px', background: 'var(--white)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <b style={{ fontSize: 13, color: 'var(--slate-900)' }}>Used on {rows.length} order{rows.length === 1 ? '' : 's'}</b>
        {rows.length > 0 && <button type="button" onClick={() => download(`/admin/coupons/${id}/orders.csv`, `promo-${code}.csv`).catch(() => {})} style={{ border: 'none', background: 'none', color: 'var(--teal-600)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>⬇ CSV</button>}
      </div>
      {rows.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--slate-400)', margin: 0 }}>Nobody has used it yet.</p>}
      {shown.map((o) => (
        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '6px 0', borderTop: '1px solid var(--slate-100)' }}>
          <span style={{ minWidth: 0 }}>
            {o.userId ? <button type="button" onClick={() => setWho(o.userId)} style={{ border: 'none', background: 'none', padding: 0, color: 'var(--teal-700)', fontWeight: 700, cursor: 'pointer', fontSize: 12.5 }}>{o.customer || o.email}</button> : '—'}
            <span style={{ color: 'var(--slate-400)' }}> · {when(o.createdAt)}</span>
          </span>
          <span style={{ whiteSpace: 'nowrap', color: 'var(--slate-600)' }}>
            −{gel(o.discount)} · <a href={`/dashboard/orders?search=${o.number}`} style={{ color: 'var(--slate-600)', fontFamily: 'monospace' }}>{o.number}</a>
            <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: o.paid ? 'var(--green-800)' : 'var(--slate-400)' }}>{o.paid ? 'paid' : o.status.toLowerCase()}</span>
          </span>
        </div>
      ))}
      {rows.length > 8 && <button type="button" onClick={() => setAll(!all)} style={{ marginTop: 6, border: 'none', background: 'none', color: 'var(--teal-600)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>{all ? 'Show fewer' : `Show all ${rows.length}`}</button>}
      {who && <CustomerDrawer id={who} onClose={() => setWho(null)} />}
    </div>
  );
}
