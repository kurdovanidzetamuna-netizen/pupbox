'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ChoiceNote from '../../../../../components/ChoiceNote';
import { api } from '@/lib/api';


export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/orders/admin/${id}`)
      .then(setOrder)
      .catch(() => setError('Order not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--slate-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !order) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: 'var(--red-600)' }}>{error || 'Order not found'}</div>
  );

  const addr = order.address;
  const payment = order.payments?.[0];
  const invoiceNum = `INV-${(order.orderNumber || order.id).slice(-8).toUpperCase()}`;
  const date = new Date(order.createdAt);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Print / back bar */}
      <div className="no-print" style={{ background: 'var(--slate-900)', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: '-apple-system, sans-serif' }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--white)', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>← Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🖨 Print / Save PDF</button>
        </div>
      </div>

      {/* Invoice */}
      <div className="page" style={{ maxWidth: 800, margin: '32px auto 64px', background: 'var(--white)', boxShadow: '0 4px 32px rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {/* Header stripe */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c1a2e 100%)', padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, background: 'var(--teal-600)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🐾</div>
              <span style={{ color: 'var(--white)', fontWeight: 700, fontSize: 18 }}>Pupbox</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>Georgia, Tbilisi</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '2px 0 0' }}>hello@pupbox.ge</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--white)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>INVOICE</div>
            <div style={{ color: 'var(--teal-400)', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{invoiceNum}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 6 }}>
              Date: {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', marginTop: 8, background: order.status === 'DELIVERED' || order.status === 'PAID' ? 'var(--emerald-600)' : 'var(--amber-600)', color: 'var(--white)', padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
              {order.status}
            </div>
          </div>
        </div>

        <div style={{ padding: '32px 40px' }}>
          {/* Bill to / Ship to */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Bill To</p>
              <p style={{ fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 3px', fontSize: 15 }}>{order.user?.firstName} {order.user?.lastName}</p>
              <p style={{ color: 'var(--slate-500)', fontSize: 13, margin: '0 0 2px' }}>{order.user?.email}</p>
              {order.user?.phone && <p style={{ color: 'var(--slate-500)', fontSize: 13, margin: 0 }}>{order.user.phone}</p>}
            </div>
            {addr && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Ship To</p>
                <p style={{ fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 3px', fontSize: 15 }}>{addr.firstName} {addr.lastName}</p>
                <p style={{ color: 'var(--slate-500)', fontSize: 13, margin: '0 0 2px' }}>{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                <p style={{ color: 'var(--slate-500)', fontSize: 13, margin: '0 0 2px' }}>{addr.city}{addr.postalCode ? ` ${addr.postalCode}` : ''}, {addr.country}</p>
                <p style={{ color: 'var(--slate-500)', fontSize: 13, margin: 0 }}>{addr.phone}</p>
              </div>
            )}
          </div>

          {/* Order meta row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, background: 'var(--slate-50)', borderRadius: 10, padding: '14px 18px', marginBottom: 32, fontSize: 12 }}>
            {[
              ['Order #', (order.orderNumber || order.id).slice(-10).toUpperCase()],
              ['Order Type', order.type],
              ['Payment', payment?.status || '—'],
              ['Delivery', order.deliveryMethod?.name || '—'],
            ].map(([label, val]) => (
              <div key={label as string}>
                <p style={{ color: 'var(--slate-400)', fontWeight: 600, margin: '0 0 3px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                <p style={{ fontWeight: 700, color: 'var(--slate-900)', margin: 0, fontFamily: typeof val === 'string' && val.match(/^[A-Z0-9-]+$/) ? 'monospace' : 'inherit' }}>{val}</p>
              </div>
            ))}
          </div>

          {/* Items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ background: 'var(--slate-900)' }}>
                {['#', 'Item', 'SKU', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: i >= 3 ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item: any, i: number) => (
                <tr key={item.id || i} style={{ background: i % 2 === 0 ? 'var(--white)' : 'var(--slate-50)', borderBottom: '1px solid var(--slate-200b)' }}>
                  <td style={{ padding: '12px 14px', color: 'var(--slate-400)', fontSize: 12 }}>{i + 1}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <p style={{ fontWeight: 600, color: 'var(--slate-900)', margin: 0, fontSize: 13 }}>{item.name}</p>
                      <ChoiceNote choice={item.personalisation} />
                    {item.subscriptionPlan && <p style={{ fontSize: 11, color: 'var(--teal-600)', margin: '2px 0 0' }}>Subscription plan</p>}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--slate-400)' }}>{item.sku || '—'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--slate-900)' }}>{item.quantity}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--slate-500)' }}>₾{Number(item.price).toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--slate-900)' }}>₾{Number(item.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
            <div style={{ width: 280 }}>
              {[
                ['Subtotal', `₾${Number(order.subtotal).toFixed(2)}`],
                ...(Number(order.deliveryCost) > 0 ? [['Delivery', `₾${Number(order.deliveryCost).toFixed(2)}`]] : [['Delivery', 'Free']]),
                ...(Number(order.discountAmount) > 0 ? [[`Discount${order.coupon ? ` (${order.coupon.code})` : ''}`, `−₾${Number(order.discountAmount).toFixed(2)}`]] : []),
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: 'var(--slate-500)', borderBottom: '1px solid var(--slate-100)' }}>
                  <span>{label}</span><span>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--slate-900)', borderTop: '2px solid var(--teal-600)', marginTop: 4 }}>
                <span>TOTAL</span><span>₾{Number(order.total).toFixed(2)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--slate-400)', textAlign: 'right', marginTop: 4 }}>All amounts in Georgian Lari (₾ GEL)</div>
            </div>
          </div>

          {/* Payment info */}
          {payment && (
            <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-800)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Payment Details</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12 }}>
                {[
                  ['Status', payment.status],
                  ['Provider', payment.provider],
                  ['Paid At', payment.paidAt ? new Date(payment.paidAt).toLocaleString('en-GB') : '—'],
                ].map(([l, v]) => (
                  <div key={l as string}>
                    <p style={{ color: 'var(--slate-400)', margin: '0 0 2px', fontWeight: 600 }}>{l}</p>
                    <p style={{ color: 'var(--slate-900)', margin: 0, fontWeight: 700 }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tracking */}
          {order.trackingNumber && (
            <div style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Tracking Number</p>
              <p style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--slate-800)', margin: 0 }}>{order.trackingNumber}</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '1px solid var(--slate-200b)', paddingTop: 20, textAlign: 'center', color: 'var(--slate-400)', fontSize: 12 }}>
            <p style={{ margin: '0 0 4px' }}>Thank you for your order! 🐾</p>
            <p style={{ margin: 0 }}>Questions? Contact us at hello@pupbox.ge · pupbox.ge</p>
          </div>
        </div>
      </div>
    </>
  );
}
