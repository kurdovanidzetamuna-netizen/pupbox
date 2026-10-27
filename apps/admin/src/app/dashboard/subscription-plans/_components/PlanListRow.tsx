import { RowActions } from '@/components/Toolbar';
import { summarisePlanCost } from '../_lib/plan-config';
import { planStatus } from '../_lib/status';

/** Column headings for the list view; widths match PlanListRow. */
export function PlanListHeader() {
  return (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 18px', marginBottom: 2 }}>
    <div style={{ flex: '0 0 180px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Plan</div>
    <div style={{ flex: '0 0 90px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Price (₾)</div>
    <div style={{ flex: '0 0 90px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Per Month (₾)</div>
    <div style={{ flex: '0 0 100px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Duration</div>
    <div style={{ flex: '0 0 80px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Discount</div>
    <div style={{ flex: '0 0 80px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Boxes</div>
    <div style={{ flex: '0 0 70px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Orders</div>
    <div style={{ flex: '0 0 120px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Margin (₾)</div>
    <div style={{ flex: '0 0 62px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Status</div>
    <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Actions</div>
  </div>
  );
}

export default function PlanListRow({ p, orderCount, canDelete, onView, onConfigure, onToggle, onToggleListed, onDelete }: {
  p: any;
  orderCount: number | undefined;
  canDelete: boolean;
  onView: () => void;
  onConfigure: () => void;
  onToggle: () => void;
  onToggleListed: () => void;
  onDelete: () => void;
}) {
  const { margin, hasConfig } = summarisePlanCost(p);
  const isDisabled = !p.isActive;
  const status = planStatus(p);

  return (
    <div key={p.id} style={{ background: isDisabled ? 'var(--slate-50)' : 'var(--white)', borderRadius: 12, border: '1px solid var(--slate-200b)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, opacity: isDisabled ? 0.6 : 1 }}>
      <div style={{ flex: '0 0 180px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-900)' }}>{p.name}</span>
          {p.badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--teal-600)', color: 'var(--white)' }}>{p.badge}</span>}
        </div>
      </div>
      <div style={{ flex: '0 0 90px' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-900)' }}>{Number(p.price).toFixed(0)}</span>
      </div>
      <div style={{ flex: '0 0 90px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-700b)' }}>{(Number(p.price) / (p.durationValue || 1)).toFixed(0)}</span>
      </div>
      <div style={{ flex: '0 0 100px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-700b)' }}>{p.durationValue} {p.durationUnit?.toLowerCase()}</span>
      </div>
      <div style={{ flex: '0 0 80px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : (p.discountPercent ? 'var(--teal-600)' : 'var(--slate-400)') }}>{p.discountPercent ? `-${p.discountPercent}%` : '—'}</span>
      </div>
      <div style={{ flex: '0 0 80px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-700b)' }}>{p.boxCount}</span>
      </div>
      <div style={{ flex: '0 0 70px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-700b)' }}>{orderCount || 0}</span>
      </div>
      <div style={{ flex: '0 0 120px', fontSize: 11 }}>
        {hasConfig ? <span style={{ color: margin >= 0 ? 'var(--green-700)' : 'var(--red-600)', fontWeight: 700 }}>{margin >= 0 ? '+' : ''}{margin.toFixed(2)}</span> : <span style={{ color: 'var(--amber-500)' }}>⚠️ Not configured</span>}
      </div>
      <span title={status.hint} style={{ flex: '0 0 62px', fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600, background: status.bg, color: status.color, textAlign: 'center' as const }}>{status.label}</span>
      {!isDisabled && <button onClick={() => onToggleListed()} title={p.listed === false ? 'Show on the site' : 'Hide from the site — current subscribers still renew'}
        style={{ fontSize: 11, padding: '6px 10px', borderRadius: 8, background: p.listed === false ? 'var(--teal-50)' : 'var(--slate-100)', color: p.listed === false ? 'var(--teal-700)' : 'var(--slate-500)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{p.listed === false ? 'Show' : 'Hide'}</button>}
      <RowActions
        onView={() => onView()}
        onConfigure={() => onConfigure()}
        onToggle={() => onToggle()}
        onDelete={() => onDelete()}
        isDisabled={isDisabled}
        canDelete={canDelete}
        toggleLabel={isDisabled ? 'Enable' : 'Disable'}
      />
    </div>
  );
}
