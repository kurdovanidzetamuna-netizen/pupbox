'use client';
import type { PlanItem } from '../../_lib/types';
import { num } from '../../_lib/plan-config';
import type { PlanBuilderState } from './usePlanBuilder';
import { NumInput } from '@/components/NumberField';

/** Right-hand column of Box Builder: what the plan costs us against what it sells for. */
export default function CostBreakdown({ b }: { b: PlanBuilderState }) {
  const {
    form, boxCount, pricingMonths, pricingDiscount, pricingTotal, pricingEffectiveMonthly,
    pricingSavings, cfg, setCfg, safeActiveBox, activeItems, activeProductTotal,
    allProductTotal, activeBoxCost, giftBoxTotal, totalCost, margin, marginPct, perBoxSell,
    marginColor, marginBg
  } = b;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Cost breakdown card */}
      <div style={{ background: 'var(--slate-50)', borderRadius: 12, border: '1px solid var(--slate-200b)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'var(--slate-900)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>Cost Breakdown</span>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>
            {boxCount > 1 ? `Box ${safeActiveBox + 1} of ${boxCount}` : `Per plan · ${boxCount} box`}
          </p>
        </div>

        <div style={{ padding: '0 0 0' }}>
          {/* Products for active box */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--slate-200b)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>📦 Products ({activeItems.length})</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)' }}>₾{activeProductTotal.toFixed(2)}</span>
            </div>
            {activeItems.map((i: PlanItem) => (
              <div key={i.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-400)', marginBottom: 2 }}>
                <span>{i.name} ×{i.qty}</span>
                <span>₾{(i.price * i.qty).toFixed(2)}</span>
              </div>
            ))}
            {boxCount > 1 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--slate-200)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-500)' }}>
                <span>All {boxCount} boxes total</span>
                <span style={{ fontWeight: 700 }}>₾{allProductTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Operational cost (per box) */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--slate-200b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>⚙️ Operational cost {boxCount > 1 ? '(per box)' : ''}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>₾</span>
              <NumInput min="0" step="0.01"
                value={cfg.operationalCost}
                onChange={e => setCfg(c => ({ ...c, operationalCost: num(e.target.value) }))}
                style={{ width: 72, border: '1px solid var(--slate-200)', borderRadius: 7, padding: '4px 8px', fontSize: 12, outline: 'none', textAlign: 'right' }}
              />
            </div>
          </div>

          {/* Delivery cost */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--slate-200b)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: cfg.deliveryFree ? 0 : 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>🚚 Delivery</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: cfg.deliveryFree ? 'var(--teal-600)' : 'var(--slate-500)', fontWeight: 600 }}>
                <input type="checkbox" checked={cfg.deliveryFree} onChange={e => setCfg(c => ({ ...c, deliveryFree: e.target.checked }))} style={{ accentColor: 'var(--teal-600)' }} />
                Free delivery
              </label>
            </div>
            {!cfg.deliveryFree && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>₾</span>
                <NumInput min="0" step="0.01"
                  value={cfg.deliveryCost}
                  onChange={e => setCfg(c => ({ ...c, deliveryCost: num(e.target.value) }))}
                  style={{ width: 72, border: '1px solid var(--slate-200)', borderRadius: 7, padding: '4px 8px', fontSize: 12, outline: 'none', textAlign: 'right' }}
                />
              </div>
            )}
          </div>

          {/* Gift boxes cost */}
          {(cfg.giftBoxes || []).length > 0 && (
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--slate-200b)', background: 'var(--fuchsia-50)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple-600)' }}>🎁 Gift Boxes ({cfg.giftBoxes.length})</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple-600)' }}>₾{giftBoxTotal.toFixed(2)}</span>
              </div>
              {cfg.giftBoxes.map(g => {
                const gc = g.items.reduce((s, i) => s + i.price * i.qty, 0);
                return (
                  <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--purple-500)', marginBottom: 2 }}>
                    <span>{g.label} ({g.items.length} items)</span>
                    <span>₾{gc.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Total cost */}
          <div style={{ padding: '10px 16px', borderBottom: '2px solid var(--slate-900)', background: 'var(--slate-100)' }}>
            {boxCount > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-500)', marginBottom: 4 }}>
                <span>Box {safeActiveBox + 1} cost</span>
                <span style={{ fontWeight: 600 }}>₾{activeBoxCost.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-900)' }}>Total cost {(cfg.giftBoxes || []).length > 0 ? '(incl. gifts)' : boxCount > 1 ? '(all boxes)' : ''}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--slate-900)' }}>₾{totalCost.toFixed(2)}</span>
            </div>
            {boxCount > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-500)', marginTop: 3 }}>
                <span>Avg per box</span><span>₾{(totalCost / boxCount).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Selling price */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--slate-200b)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>Total price</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: pricingTotal > 0 ? 'var(--slate-900)' : 'var(--slate-400)' }}>
                {pricingTotal > 0 ? `₾${pricingTotal.toFixed(2)}` : '—'}
              </span>
            </div>
            {pricingDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--teal-600)', marginTop: 2 }}>
                <span>After {pricingDiscount}% discount</span>
                <span>Save ₾{pricingSavings.toFixed(2)}</span>
              </div>
            )}
            {boxCount > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-500)', marginTop: 3 }}>
                <span>Per box</span><span>₾{perBoxSell.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Margin */}
          <div style={{ padding: '14px 16px', background: marginBg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: marginColor }}>{margin >= 0 ? '✅ Margin' : '❌ Loss'}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: marginColor }}>{margin >= 0 ? '+' : ''}₾{margin.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: marginColor, marginTop: 4, opacity: 0.8 }}>
              <span>Margin %</span>
              <span style={{ fontWeight: 700 }}>{marginPct >= 0 ? '+' : ''}{marginPct.toFixed(1)}%</span>
            </div>
            {boxCount > 1 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: marginColor, marginTop: 3, opacity: 0.7 }}>
                  <span>Avg per box margin</span>
                  <span>{margin >= 0 ? '+' : ''}₾{(margin / boxCount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: marginColor, marginTop: 2, opacity: 0.7 }}>
                  <span>Box {safeActiveBox + 1} margin</span>
                  <span>{(perBoxSell - activeBoxCost) >= 0 ? '+' : ''}₾{(perBoxSell - activeBoxCost).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Selling price summary */}
      <div style={{ background: 'var(--teal-50)', borderRadius: 10, border: '1px solid var(--teal-200)', padding: '12px 14px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal-600)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>What customer sees</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>₾{pricingTotal.toFixed(2)}</p>
        <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '3px 0 0' }}>
          {pricingMonths} month{pricingMonths > 1 ? 's' : ''} · {boxCount} box{boxCount > 1 ? 'es' : ''} · {cfg.deliveryFree ? 'Free delivery' : `₾${Number(cfg.deliveryCost).toFixed(2)} delivery`}
        </p>
        {pricingEffectiveMonthly > 0 && <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '3px 0 0' }}>₾{pricingEffectiveMonthly.toFixed(2)} / month</p>}
        {pricingSavings > 0 && <p style={{ fontSize: 12, color: 'var(--teal-600)', margin: '3px 0 0', fontWeight: 600 }}>You save ₾{pricingSavings.toFixed(2)} ({pricingDiscount}%)</p>}
        {(cfg.giftBoxes || []).map(g => (
          <p key={g.id} style={{ fontSize: 12, color: 'var(--purple-600)', margin: '3px 0 0', fontWeight: 600 }}>
            🎁 {g.label}{g.description ? ` — ${g.description}` : ''}
          </p>
        ))}

        {/* Whatever is switched on under "How it behaves" shows up
            here, so the effect of those chips is visible. */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--teal-200)' }}>
          {[
            { on: form.isActive && form.listed !== false, icon: '✅', label: 'Live on site', c: 'var(--green-800)', bg: 'var(--green-50)', b: 'var(--green-200)' },
            { on: form.autoRenewal, icon: '🔄', label: 'Auto renews', c: 'var(--teal-700)', bg: 'var(--teal-50)', b: 'var(--teal-200)' },
            { on: form.giftable, icon: '🎁', label: 'Giftable', c: 'var(--amber-700)', bg: 'var(--amber-50)', b: 'var(--amber-200)' },
            { on: form.deliveryIncluded, icon: '🚚', label: 'Delivery included', c: 'var(--teal-700)', bg: 'var(--teal-50)', b: 'var(--teal-200)' },
          ].filter(x => x.on).map(x => (
            <span key={x.label} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: x.bg, color: x.c, border: `1px solid ${x.b}`, whiteSpace: 'nowrap' }}>
              {x.icon} {x.label}
            </span>
          ))}
          {![form.isActive, form.autoRenewal, form.giftable, form.deliveryIncluded].some(Boolean) && (
            <span style={{ fontSize: 11, color: 'var(--slate-400)', fontStyle: 'italic' }}>Nothing switched on under “How it behaves”</span>
          )}
        </div>
      </div>
    </div>
  );
}
