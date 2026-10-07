import { summarisePlanCost } from '../_lib/plan-config';

/** Read-only summary of a plan, with a shortcut into the builder. */
export default function PlanViewModal({ plan: vp, orderCount, onClose, onConfigure }: {
  plan: any;
  orderCount: number;
  onClose: () => void;
  onConfigure: () => void;
}) {
  const { cfg, hasConfig, productCost, opCost, delCost, margin } = summarisePlanCost(vp);
  const isDisabled = !vp.isActive;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        {/* Sticky header */}
        <div style={{ padding: '28px 36px 20px', borderBottom: '1px solid var(--slate-200)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--slate-900)' }}>{vp.name}</h2>
                {vp.badge && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' }}>{vp.badge}</span>}
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: isDisabled ? 'var(--slate-100)' : 'var(--green-50)', color: isDisabled ? 'var(--slate-400)' : 'var(--green-800)' }}>{isDisabled ? 'Disabled' : 'Live'}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-500)' }}>{vp.durationValue} month{vp.durationValue > 1 ? 's' : ''} · {vp.boxCount} box{vp.boxCount > 1 ? 'es' : ''}</p>
            </div>
            <button onClick={onClose}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.9)'; }}
              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: 'var(--slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, transform 0.1s', flexShrink: 0 }}>×</button>
          </div>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Price', value: `₾${Number(vp.price).toFixed(2)}` },
              { label: 'Orders', value: String(orderCount) },
              { label: 'Discount', value: vp.discountPercent ? `-${vp.discountPercent}%` : '—' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--slate-50)', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--slate-400)', marginBottom: 2 }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px 36px' }}>

        {/* Description */}
        {(vp.description || vp.descriptionKa) && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Description</p>
            {vp.description && <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--slate-700b)' }}><strong>EN:</strong> {vp.description}</p>}
            {vp.descriptionKa && <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-700b)' }}><strong>KA:</strong> {vp.descriptionKa}</p>}
          </div>
        )}

        {/* Delivery + Settings row */}
        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 13, color: 'var(--slate-700b)', background: 'rgba(241,245,249,0.7)', padding: '4px 12px', borderRadius: 8 }}>
            Delivery: <strong>{cfg?.deliveryFree ? 'Free' : cfg ? `₾${Number(cfg.deliveryCost || 0).toFixed(2)}` : '—'}</strong>
          </span>
          <span style={{ fontSize: 13, color: vp.autoRenewal ? 'var(--green-800)' : 'var(--slate-500)', background: vp.autoRenewal ? 'rgba(240,253,244,0.7)' : 'rgba(241,245,249,0.7)', padding: '4px 12px', borderRadius: 8 }}>
            Auto-Renewal: <strong>{vp.autoRenewal ? 'On' : 'Off'}</strong>
          </span>
          <span style={{ fontSize: 13, color: !isDisabled ? 'var(--green-800)' : 'var(--slate-500)', background: !isDisabled ? 'rgba(240,253,244,0.7)' : 'rgba(241,245,249,0.7)', padding: '4px 12px', borderRadius: 8 }}>
            Active: <strong>{!isDisabled ? 'Live' : 'Hidden'}</strong>
          </span>
        </div>

        {/* Products list */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Products Included</p>
          {hasConfig ? (
            <div style={{ border: '1px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 0 }}>
                {/* Header */}
                <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>Product</div>
                <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', textAlign: 'center' as const }}>Qty</div>
                <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', textAlign: 'right' as const }}>Cost</div>
                {/* Rows */}
                {(cfg.planItems || []).map((it: any, ii: number) => (
                  <>
                    <div key={`n${ii}`} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--slate-700b)', borderBottom: ii < cfg.planItems.length - 1 ? '1px solid var(--slate-100)' : 'none' }}>{it.name || it.productName || '—'}</div>
                    <div key={`q${ii}`} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--slate-500)', textAlign: 'center' as const, borderBottom: ii < cfg.planItems.length - 1 ? '1px solid var(--slate-100)' : 'none' }}>×{it.qty || 1}</div>
                    <div key={`p${ii}`} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--slate-700b)', fontWeight: 600, textAlign: 'right' as const, borderBottom: ii < cfg.planItems.length - 1 ? '1px solid var(--slate-100)' : 'none' }}>₾{((it.price || 0) * (it.qty || 1)).toFixed(2)}</div>
                  </>
                ))}
              </div>
              {/* Totals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0, borderTop: '1px solid var(--slate-200)', background: 'var(--slate-50)' }}>
                <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--slate-500)' }}>Products subtotal</div>
                <div style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, color: 'var(--slate-700b)', textAlign: 'right' as const }}>₾{productCost.toFixed(2)}</div>
                {opCost > 0 && <>
                  <div style={{ padding: '4px 14px', fontSize: 12, color: 'var(--slate-500)' }}>Operational cost</div>
                  <div style={{ padding: '4px 14px', fontSize: 12, fontWeight: 600, color: 'var(--slate-700b)', textAlign: 'right' as const }}>₾{opCost.toFixed(2)}</div>
                </>}
                <div style={{ padding: '4px 14px 8px', fontSize: 12, color: 'var(--slate-500)' }}>Delivery</div>
                <div style={{ padding: '4px 14px 8px', fontSize: 12, fontWeight: 600, color: 'var(--slate-700b)', textAlign: 'right' as const }}>{cfg?.deliveryFree ? 'Free' : `₾${delCost.toFixed(2)}`}</div>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-400)', fontStyle: 'italic' }}>No products added yet</p>
          )}
        </div>

        {/* Margin summary */}
        {hasConfig ? (
          <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: margin >= 0 ? 'var(--green-800)' : 'var(--red-600)' }}>{margin >= 0 ? '✅ Margin' : '❌ Loss'}</span>
            <span style={{ color: margin >= 0 ? 'var(--green-800)' : 'var(--red-600)' }}>{margin >= 0 ? '+' : ''}₾{margin.toFixed(2)}</span>
          </div>
        ) : (
          <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--amber-800)' }}>⚠️ Not configured — no box items or costs set yet</div>
        )}

        </div>{/* end scrollable */}

        {/* Sticky footer */}
        <div style={{ display: 'flex', gap: 10, padding: '16px 36px', borderTop: '1px solid var(--slate-200)', background: 'var(--white)', borderRadius: '0 0 18px 18px', flexShrink: 0 }}>
          <button onClick={() => onConfigure}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'var(--teal-600)', color: 'var(--white)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'background 0.15s, transform 0.1s' }}>Configure</button>
          <button onClick={onClose}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-200)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'var(--slate-100)', color: 'var(--slate-700b)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'background 0.15s, transform 0.1s' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
