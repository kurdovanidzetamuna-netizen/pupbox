'use client';
import { num } from '../../_lib/plan-config';
import Pill from '../ui/Pill';
import type { PlanBuilderState } from './usePlanBuilder';
import { NumInput } from '@/components/NumberField';

export default function DiscountsTab({ b }: { b: PlanBuilderState }) {
  const {
    coupons, saving, pricingTotal, cfg, setCfg, toggleCoupon, save
  } = b;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Referral discount */}
      <div style={{ background: 'var(--slate-50)', borderRadius: 12, border: '1px solid var(--slate-200b)', padding: '18px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>🔗 Referral Discount</p>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 0 16px' }}>Discount automatically applied when a new customer signs up via a referral link and buys this plan.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, color: 'var(--slate-700b)', fontWeight: 600 }}>Discount %</label>
          <NumInput min="0" max="100" step="1"
            value={cfg.referralDiscountPercent}
            onChange={e => setCfg(c => ({ ...c, referralDiscountPercent: num(e.target.value) }))}
            style={{ width: 80, border: '1px solid var(--slate-200)', borderRadius: 9, padding: '8px 12px', fontSize: 14, fontWeight: 700, outline: 'none', textAlign: 'center' }}
          />
          <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>% off first payment</span>
        </div>
        {cfg.referralDiscountPercent > 0 && (
          <div style={{ marginTop: 12, background: 'var(--teal-50)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--teal-600)' }}>
            Customer pays ₾{(pricingTotal * (1 - cfg.referralDiscountPercent / 100)).toFixed(2)} instead of ₾{pricingTotal.toFixed(2)} on first order via referral
          </div>
        )}
      </div>

      {/* Promo codes */}
      <div style={{ background: 'var(--slate-50)', borderRadius: 12, border: '1px solid var(--slate-200b)', padding: '18px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>🏷️ Promo Codes</p>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 0 16px' }}>Active promo codes that can be applied to this plan. Toggle to allow/block each coupon.</p>

        {coupons.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--slate-400)', padding: '12px 0' }}>
            No active promo codes yet. Create them in the <strong>Promo codes</strong> page first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {coupons.map((c: any) => {
              const linked = cfg.couponIds.includes(c.id);
              return (
                <div key={c.id} onClick={() => toggleCoupon(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: linked ? '2px solid var(--teal-600)' : '1px solid var(--slate-200)', background: linked ? 'var(--teal-50)' : 'var(--white)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, border: linked ? 'none' : '2px solid var(--slate-200)', background: linked ? 'var(--teal-600)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {linked && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5L9 3" stroke="var(--white)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--slate-900)', fontSize: 13, background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 5 }}>{c.code}</span>
                    {c.description && <span style={{ fontSize: 12, color: 'var(--slate-400)', marginLeft: 8 }}>{c.description}</span>}
                  </div>
                  <Pill bg={c.discountType === 'PERCENT' ? 'var(--teal-50)' : 'var(--blue-50)'} color={c.discountType === 'PERCENT' ? 'var(--teal-600)' : 'var(--blue-600)'} border="none">
                    {c.discountType === 'PERCENT' ? `${c.discountValue}% off` : `₾${c.discountValue} off`}
                  </Pill>
                  {c.expiresAt && (
                    <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>Until {new Date(c.expiresAt).toLocaleDateString('en-GB')}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {cfg.couponIds.length > 0 && (
          <div style={{ marginTop: 14, background: 'var(--amber-50)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--amber-800)' }}>
            ℹ️ {cfg.couponIds.length} coupon{cfg.couponIds.length > 1 ? 's' : ''} linked to this plan. These will be shown as available options at checkout.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--slate-200b)' }}>
        <button onClick={() => save()} disabled={saving}
          onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 9, padding: '8px 22px', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'background 0.15s, transform 0.1s' }}>
          {saving ? 'Saving…' : '💾 Save Discounts'}
        </button>
      </div>
    </div>
  );
}
