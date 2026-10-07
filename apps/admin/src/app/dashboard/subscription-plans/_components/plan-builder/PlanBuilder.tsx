'use client';
import QuickAddBoxItemModal from '@/components/QuickAddBoxItemModal';
import Pill from '../ui/Pill';
import BuilderToast from './BuilderToast';
import DiscardChangesDialog from './DiscardChangesDialog';
import GeorgianIncompleteBanner from './GeorgianIncompleteBanner';
import BoxBuilderTab from './BoxBuilderTab';
import PlanSettingsTab from './PlanSettingsTab';
import DiscountsTab from './DiscountsTab';
import { usePlanBuilder, type PlanBuilderProps } from './usePlanBuilder';

// ── Plan Builder (right-side drawer) ─────────────────────────────────────────
export default function PlanBuilder(props: PlanBuilderProps) {
  const b = usePlanBuilder(props);
  const {
    plan, onClose, tab, setTab, saving, setLang, formErrors, toast, setToast, cfg,
    setActiveBox, showNewBoxItemDrawer, setShowNewBoxItemDrawer, showCloseConfirm,
    setShowCloseConfirm, tryClose, loadBoxItems, allProductTotal, blockers, canCreate, save
  } = b;
  return (
    <>
      <div onClick={tryClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50, backdropFilter: 'blur(2px)' }} />

      {/* Toast notification */}
      {toast && <BuilderToast toast={toast} onDismiss={() => setToast(null)} />}

      {/* Unsaved changes confirm */}
      {showCloseConfirm && <DiscardChangesDialog onDiscard={onClose} onCancel={() => setShowCloseConfirm(false)} />}
      <div style={{ position: 'fixed', top: 0, right: 0, width: 820, height: '100%', background: 'var(--white)', zIndex: 51, overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ position: 'sticky', top: 0, background: 'var(--slate-900)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1, flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--white)', fontWeight: 800, fontSize: 16 }}>{plan.name || 'New Plan'}</span>
              {plan.price ? <Pill bg="var(--teal-50)" color="var(--teal-600)" border="1px solid var(--teal-200)">₾{Number(plan.price).toFixed(2)}</Pill> : null}
              {plan.badge && <Pill bg="var(--teal-600)" color="var(--white)" border="none">{plan.badge}</Pill>}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0' }}>
              {plan.id
                ? `${plan.durationValue} ${plan.durationUnit.toLowerCase()}s · ${plan.boxCount} box${plan.boxCount > 1 ? 'es' : ''}`
                : blockers.length === 0
                  ? 'Ready to create'
                  : `${blockers.length} thing${blockers.length > 1 ? 's' : ''} left before you can create it`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => save(true)} disabled={saving}
              onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
              onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              title={plan.id ? 'Save changes to this plan' : canCreate ? 'Create this plan' : `Still needed: ${blockers.map(b => b.label).join(', ')}`}
              style={{ background: plan.id || canCreate ? 'var(--teal-600)' : 'var(--slate-600)', color: 'var(--white)', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : plan.id || canCreate ? 1 : 0.55, transition: 'background 0.15s, transform 0.1s' }}>
              {saving ? 'Saving…' : plan.id ? '✓ Save All' : canCreate ? '✓ Save All' : `Save All · ${blockers.length} left`}
            </button>
            <button onClick={tryClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--white)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--slate-200b)', flexShrink: 0 }}>
          {/* Every tab stays reachable so the next steps are visible from the
              start; a tick marks the ones already done. */}
          {([
            { t: 'form' as const, label: 'Plan Settings', icon: '⚙️', done: blockers.length === 0 },
            { t: 'builder' as const, label: 'Box Builder', icon: '📦', done: allProductTotal > 0 },
            { t: 'discounts' as const, label: 'Discounts', icon: '🏷️', done: (cfg.couponIds || []).length > 0 },
          ]).map(({ t, label, icon, done }) => {
            const active = tab === t;
            return (
              <button key={t}
                onClick={() => { setTab(t); if (t === 'builder') setActiveBox(0); }}
                style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', display: 'flex', alignItems: 'center', gap: 7, color: active ? 'var(--teal-600)' : 'var(--slate-500)', borderBottom: active ? '2px solid var(--teal-600)' : '2px solid transparent' }}>
                <span>{icon}</span>
                <span>{label}</span>
                {done && <span style={{ fontSize: 10, color: 'var(--emerald-600)', fontWeight: 800 }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>

          {/* ── Global validation errors ── */}
          {Object.keys(formErrors).some(k => formErrors[k]) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {formErrors.kaName && (
                <GeorgianIncompleteBanner onClick={() => { setTab('form'); setLang('ka'); }} />
              )}
              {Object.entries(formErrors).filter(([k, v]) => k !== 'kaName' && v).map(([k, msg]) => (
                <div key={k} onClick={() => { setTab('form'); setLang('en'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--red-50)', border: '1.5px solid var(--red-300)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}>
                  <svg width="14" height="14" fill="none" stroke="var(--red-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red-600)' }}>{msg as string} — <u>click to fix</u></span>
                </div>
              ))}
            </div>
          )}

          {/* ── BOX BUILDER TAB ── */}
          {tab === 'builder' && <BoxBuilderTab b={b} />}

          {/* ── PLAN SETTINGS TAB ── */}
          {tab === 'form' && <PlanSettingsTab b={b} />}

          {/* ── DISCOUNTS TAB ── */}
          {tab === 'discounts' && <DiscountsTab b={b} />}
        </div>
      </div>
      {showNewBoxItemDrawer && <QuickAddBoxItemModal onClose={() => setShowNewBoxItemDrawer(false)} onCreated={loadBoxItems} />}
    </>
  );
}
