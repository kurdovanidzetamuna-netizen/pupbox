import { summarisePlanCost } from '../_lib/plan-config';
import { planStatus } from '../_lib/status';

export default function PlanCard({ p, canDelete, onView, onConfigure, onToggle, onToggleListed, onDelete }: {
  p: any;
  canDelete: boolean;
  onView: () => void;
  onConfigure: () => void;
  onToggle: () => void;
  onToggleListed: () => void;
  onDelete: () => void;
}) {
  const { cfg, itemCount, productCost, opCost, delCost, margin, hasConfig } = summarisePlanCost(p);
  const isDisabled = !p.isActive;
  const status = planStatus(p);

  return (
    <div key={p.id}
      onMouseEnter={e => { if (!isDisabled) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
      style={{ background: isDisabled ? 'var(--slate-50)' : 'var(--white)', borderRadius: 16, border: p.badge ? '2px solid var(--teal-600)' : isDisabled ? '1px solid var(--slate-200)' : '1px solid var(--slate-200b)', padding: 22, position: 'relative', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', opacity: isDisabled ? 0.65 : 1, transition: 'box-shadow 0.18s, transform 0.18s' }}>
      {p.badge && <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--teal-600)', color: 'var(--white)', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 999, whiteSpace: 'nowrap' as const }}>{p.badge}</span>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-900)', margin: 0 }}>{p.name}</h3>
          <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '3px 0 0' }}>{p.durationValue} {p.durationUnit.toLowerCase()} · {p.boxCount} box{p.boxCount > 1 ? 'es' : ''}</p>
        </div>
        <span title={status.hint} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600, background: status.bg, color: status.color }}>{status.label}</span>
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-900)', margin: '0 0 2px' }}>₾{Number(p.price).toFixed(0)}</p>
      {p.discountPercent && <p style={{ fontSize: 12, color: 'var(--teal-600)', fontWeight: 600, margin: '0 0 12px' }}>Save {p.discountPercent}%</p>}
      {hasConfig ? (
        <div style={{ background: 'var(--slate-50)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-500)', marginBottom: 3 }}><span>📦 {itemCount} products</span><span>₾{productCost.toFixed(2)}</span></div>
          {opCost > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-500)', marginBottom: 3 }}><span>⚙️ Operational</span><span>₾{opCost.toFixed(2)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-500)', marginBottom: 6 }}><span>🚚 Delivery</span><span>{cfg?.deliveryFree ? 'Free' : `₾${delCost.toFixed(2)}`}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 5, borderTop: '1px solid var(--slate-200b)', fontWeight: 700 }}>
            <span style={{ color: margin >= 0 ? 'var(--green-700)' : 'var(--red-600)' }}>{margin >= 0 ? '✅ Margin' : '❌ Loss'}</span>
            <span style={{ color: margin >= 0 ? 'var(--green-700)' : 'var(--red-600)' }}>{margin >= 0 ? '+' : ''}₾{margin.toFixed(2)}</span>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: 'var(--amber-800)' }}>⚠️ Not configured — click Configure to add box items and costs</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onView()}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.08)'; }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.08)'; }}
          style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(13,148,136,0.08)', color: 'var(--teal-600)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, transform 0.1s', flexShrink: 0 }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>
        </button>
        <button onClick={() => onConfigure()}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          style={{ flex: 1, fontSize: 11, padding: '6px 10px', borderRadius: 8, background: 'var(--teal-600)', color: 'var(--white)', border: 'none', cursor: 'pointer', fontWeight: 700, transition: 'background 0.15s, transform 0.1s' }}>Configure</button>
        {!isDisabled && <button onClick={() => onToggleListed()} title={p.listed === false ? 'Show on the site' : 'Hide from the site — current subscribers still renew'}
          style={{ flex: 1, fontSize: 11, padding: '6px 10px', borderRadius: 8, background: p.listed === false ? 'var(--teal-50)' : 'var(--slate-100)', color: p.listed === false ? 'var(--teal-700)' : 'var(--slate-500)', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'background 0.15s' }}>{p.listed === false ? 'Show' : 'Hide'}</button>}
        <button onClick={() => onToggle()}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDisabled ? 'var(--green-100)' : 'var(--slate-200)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isDisabled ? 'var(--green-50)' : 'var(--slate-100)'; }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          style={{ flex: 1, fontSize: 11, padding: '6px 10px', borderRadius: 8, background: isDisabled ? 'var(--green-50)' : 'var(--slate-100)', color: isDisabled ? 'var(--green-800)' : 'var(--slate-500)', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'background 0.15s, transform 0.1s' }}>{isDisabled ? 'Enable' : 'Disable'}</button>
        {canDelete && <button onClick={() => onDelete()}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-100)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-50)'; }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          style={{ fontSize: 11, padding: '6px 10px', borderRadius: 8, background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'background 0.15s, transform 0.1s' }}>Delete</button>}
      </div>
    </div>
  );
}
