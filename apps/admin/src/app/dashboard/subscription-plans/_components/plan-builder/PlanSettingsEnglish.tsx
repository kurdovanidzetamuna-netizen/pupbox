'use client';
import FormField, { inputClass } from '@/components/FormField';
import { CustomSelect } from '@/components/Toolbar';
import { num, slugify } from '../../_lib/plan-config';
import NumberField from '../ui/NumberField';
import StepHeading from '../ui/StepHeading';
import SettingTile from '../ui/SettingTile';
import BenefitsEditor from '../ui/BenefitsEditor';
import type { PlanBuilderState } from './usePlanBuilder';

/** English side of Plan Settings: the four numbered steps that define a plan. */
export default function PlanSettingsEnglish({ b }: { b: PlanBuilderState }) {
  const {
    plan, badges, addBadge, tiers, formErrors, setFormErrors, showNewBadge, setShowNewBadge,
    slugTouched, setSlugTouched, newBadgeInput, setNewBadgeInput, form, setForm, boxCount,
    boxesLinked, setMonths, setBoxes, pricingMonths, pricingTotal, pricingEffectiveMonthly,
    pricingSavings, cfg, setCfg, totalCost
  } = b;
  return (
    <>
    {/* ── 1 · What the plan is ──────────────────────────────
        Name leads, because it is the decision. The slug is
        derived from it and stays hidden: exposing it is how the
        catalogue ended up with a plan slugged "3---month". */}
    {/* ── 1 · What the plan is ───────────────────────────── */}
    <StepHeading n={1} title="What the plan is" hint="Its name, its length, and how it is listed" />
    {/* Name, length, badge and sort order on one row: four short
        answers that belong together, rather than a tall stack.
        Months and boxes share a cell because they are one
        decision — "six boxes over six months" — and splitting
        them across sections is how they drifted apart before. */}
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1.9fr) minmax(190px, 1.5fr) minmax(130px, 1.1fr) 84px', gap: 10, alignItems: 'start', marginBottom: 6 }}>
      <FormField label="Plan name" required error={formErrors.name}>
        <input
          value={form.name ?? ''}
          onChange={e => {
            const name = e.target.value;
            setForm((x: any) => ({
              ...x,
              name,
              // Only auto-follow the name while the slug has not
              // been taken over by hand, and never for a plan
              // that already exists — its URL is in the wild.
              ...(slugTouched || plan.id ? {} : { slug: slugify(name) }),
            }));
            setFormErrors((e2: any) => ({ ...e2, name: '', slug: '' }));
          }}
          placeholder="e.g. 6 Months"
          style={{ ...inputClass(), fontWeight: 600, ...(formErrors.name ? { borderColor: 'var(--red-500)' } : {}) }}
        />
      </FormField>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700b)', marginBottom: 6 }}>
          Length <span style={{ color: 'var(--red-500)' }}>*</span>
        </label>
        {/* minmax(0,…) rather than 1fr: a number input carries a
            wide intrinsic size, so plain 1fr lets the pair
            overflow the cell instead of shrinking. The unit
            sits underneath rather than inline for the same
            reason — there is no room for it beside the digits. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 6 }}>
          {[
            { v: form.durationValue, on: setMonths, cap: pricingMonths === 1 ? 'month' : 'months', err: !!formErrors.durationValue },
            { v: form.boxCount, on: setBoxes, cap: boxCount === 1 ? 'box' : 'boxes', err: !!formErrors.boxCount },
          ].map(f => (
            <div key={f.cap}>
              <NumberField min={1} value={f.v ?? ''} placeholder="6" error={f.err} onChange={f.on} />
              <p style={{ fontSize: 10, color: 'var(--slate-400)', margin: '3px 0 0', textAlign: 'center' }}>{f.cap}</p>
            </div>
          ))}
        </div>
        {/* Says which of the two is in charge, so the box count
            moving on its own is never a surprise. */}
        {boxesLinked ? (
          <p style={{ fontSize: 10.5, color: 'var(--slate-400)', margin: '4px 0 0', lineHeight: 1.35 }}>
            One box a month — set your own count to change it.
          </p>
        ) : (
          <p style={{ fontSize: 10.5, color: 'var(--amber-700)', margin: '4px 0 0', lineHeight: 1.35 }}>
            {boxCount} box{boxCount === 1 ? '' : 'es'} over {pricingMonths} month{pricingMonths === 1 ? '' : 's'} ·{' '}
            <button type="button" onClick={() => setBoxes(String(form.durationValue ?? ''))}
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--teal-600)', cursor: 'pointer', textDecoration: 'underline' }}>
              match months
            </button>
          </p>
        )}
        {(formErrors.durationValue || formErrors.boxCount) && (
          <p style={{ fontSize: 10.5, color: 'var(--red-600)', margin: '3px 0 0' }}>{formErrors.durationValue || formErrors.boxCount}</p>
        )}
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700b)', marginBottom: 6 }}>Badge</label>
        <CustomSelect
          value={form.badge || ''}
          onChange={v => { if (v === '__new__') { setShowNewBadge(true); } else { setForm((x: any) => ({ ...x, badge: v })); } }}
          placeholder="No badge"
          options={[
            { value: '__new__', label: '＋ Create new badge…' },
            { value: '', label: 'No badge', dividerBefore: true },
            ...badges.map(b => ({ value: b, label: b })),
          ]}
          style={{ width: '100%' }}
        />

        {/* Inline new-badge creator */}
        {showNewBadge && (
          <div style={{ marginTop: 8, background: 'var(--slate-50)', border: '1.5px solid var(--slate-200)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                autoFocus
                value={newBadgeInput}
                onChange={e => setNewBadgeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newBadgeInput.trim()) {
                    const label = newBadgeInput.trim();
                    addBadge(label);
                    setForm((x: any) => ({ ...x, badge: label }));
                    setNewBadgeInput(''); setShowNewBadge(false);
                  }
                  if (e.key === 'Escape') { setShowNewBadge(false); setNewBadgeInput(''); }
                }}
                placeholder="e.g. Flash Sale"
                style={{ padding: '6px 10px', fontSize: 12, border: '1.5px solid var(--slate-200)', borderRadius: 8, outline: 'none', background: 'var(--white)', flex: 1, minWidth: 0 }}
              />
              <button
                type="button"
                onClick={() => {
                  const label = newBadgeInput.trim();
                  if (!label) return;
                  addBadge(label);
                  setForm((x: any) => ({ ...x, badge: label }));
                  setNewBadgeInput(''); setShowNewBadge(false);
                }}
                style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', background: 'var(--teal-600)', color: 'var(--white)', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >+ Add</button>
              <button type="button" onClick={() => { setShowNewBadge(false); setNewBadgeInput(''); }}
                style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1.5px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-500)', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          </div>
        )}
        <p style={{ fontSize: 10.5, color: 'var(--slate-400)', margin: '4px 0 0', lineHeight: 1.35 }}>One per label across all plans.</p>
      </div>
      <FormField label="Order" hint="Lowest first">
        <NumberField min={0} value={form.sortOrder ?? ''} placeholder="0"
          onChange={v => setForm((x: any) => ({ ...x, sortOrder: v }))} />
      </FormField>
    </div>

    {/* Box type: which box this plan sends. One plan = one box type + one
        length, so Mini 3 months and Premium 3 months are separate plans. */}
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700b)', marginBottom: 6 }}>Box type</label>
      <div role="radiogroup" aria-label="Box type" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {[{ id: '', name: 'None', emoji: '—', itemCount: null, isActive: true }, ...tiers].map((t: any) => {
          const on = (form.tierId || '') === t.id;
          return (
            <button key={t.id || 'none'} type="button" role="radio" aria-checked={on}
              onClick={() => setForm((x: any) => ({ ...x, tierId: t.id }))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${on ? 'var(--teal-500)' : 'var(--slate-200)'}`, background: on ? 'var(--teal-50)' : 'var(--white)', color: on ? 'var(--teal-700)' : 'var(--slate-600)', opacity: t.isActive ? 1 : 0.6 }}>
              <span aria-hidden="true">{t.emoji || '📦'}</span>{t.name}
              {t.itemCount != null && <span style={{ fontWeight: 500, color: 'var(--slate-400)' }}>· {t.itemCount} items</span>}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 10.5, color: 'var(--slate-400)', margin: '4px 0 0' }}>
        The site groups plans by box type. A plan with no box type is listed under “More plans”, below the box types.
      </p>
    </div>

    {/* Derived from the name; only shown as a reminder of the URL. */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 11, color: 'var(--slate-400)' }}>
      <span>Web address:</span>
      <code style={{ background: 'var(--slate-100)', borderRadius: 5, padding: '1px 6px', color: 'var(--slate-600)' }}>/prices/{form.slug || '…'}</code>
      <button type="button" onClick={() => setSlugTouched(t => !t)}
        style={{ background: 'none', border: 'none', color: 'var(--teal-600)', cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
        {slugTouched ? 'use the name' : 'edit'}
      </button>
      {slugTouched && (
        <input value={form.slug ?? ''} onChange={e => { setForm((x: any) => ({ ...x, slug: e.target.value })); setFormErrors((e2: any) => ({ ...e2, slug: '' })); }}
          placeholder="6-months" style={{ ...inputClass(), width: 200, fontFamily: 'monospace', fontSize: 12, padding: '4px 8px', ...(formErrors.slug ? { borderColor: 'var(--red-500)' } : {}) }} />
      )}
    </div>

    {/* ── 2 · How it behaves ───────────────────────────────
        Leads the form: what a plan does is the decision that
        shapes everything under it. */}
    <StepHeading n={2} title="How it behaves" hint="Tap to turn on or off — hover for what each does" />
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
      <SettingTile
        icon="✅" title="Active"
        onLabel="Sold and renews" offLabel="Retired — no sales, no renewals"
        detail="Turning a plan off retires it: nobody can buy it, and the people already on it stop renewing when their term ends. To only take it off the website, use On the site instead."
        checked={form.isActive} onChange={v => setForm((x: any) => ({ ...x, isActive: v }))}
        accent="var(--emerald-600)" tint="var(--green-50)"
      />
      <SettingTile
        icon="👁️" title="On the site"
        onLabel="Shown on the pricing page" offLabel="Hidden — current subscribers still renew"
        detail="Shows this plan on the website so new customers can buy it. Hide it and it disappears from the site and can't be bought, but everyone already on it keeps renewing as normal."
        checked={form.listed !== false} onChange={v => setForm((x: any) => ({ ...x, listed: v }))}
      />
      <SettingTile
        icon="🔄" title="Auto renewal"
        onLabel="Renews and charges automatically" offLabel="Ends after the final box"
        detail="When enabled, customers on this plan are automatically charged and receive the next box when their current period ends — no action needed from them. They can turn it off anytime from their account."
        checked={form.autoRenewal} onChange={v => setForm((x: any) => ({ ...x, autoRenewal: v }))}
      />
      <SettingTile
        icon="🎁" title="Can be gifted"
        onLabel="Buyable for someone else's dog" offLabel="Cannot be given as a gift"
        detail="Lets customers buy this plan for someone else's dog. The recipient gets an emailed gift card, then adds their own dog and address before the first box ships. Gifted subscriptions never auto-renew, whatever this plan's auto-renewal setting says."
        checked={form.giftable} onChange={v => setForm((x: any) => ({ ...x, giftable: v }))}
        accent="var(--amber-700)" tint="var(--amber-50)"
      />
      <SettingTile
        icon="🚚" title="Free delivery"
        onLabel="No delivery charge" offLabel={`₾${Number(cfg.deliveryCost || 0).toFixed(2)} per box`}
        detail="Covers delivery for every box on this plan. Turn it off to charge a fixed amount per box instead — the cost feeds into the plan's total price calculation."
        checked={cfg.deliveryFree} onChange={v => setCfg(c => ({ ...c, deliveryFree: v }))}
      />
      <SettingTile
        icon="🏷️" title="Delivery badge"
        onLabel="Badge shown on the card" offLabel="No badge shown"
        detail="Displays a small “Delivery included” badge on this plan's card on the pricing page. Set the actual delivery charge with the Free delivery chip."
        checked={form.deliveryIncluded} onChange={v => setForm((x: any) => ({ ...x, deliveryIncluded: v }))}
      />
    </div>
    {!cfg.deliveryFree && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: 'var(--slate-50)', borderRadius: 10, padding: '9px 13px' }}>
        <label style={{ fontSize: 12, color: 'var(--slate-600)', fontWeight: 600 }}>Delivery cost per box</label>
        <NumberField min={0} step={0.01} prefix="₾" width={132}
          value={cfg.deliveryCost} onChange={v => setCfg(c => ({ ...c, deliveryCost: num(v) }))} />
      </div>
    )}

    {/* ── 3 · Pricing ── */}
    <StepHeading n={3} title="What it costs" hint={`Set a monthly rate and a discount — multiplied over the ${pricingMonths} month${pricingMonths === 1 ? '' : 's'} set above`} />
    <div style={{ background: 'var(--slate-50)', borderRadius: 14, border: '1px solid var(--slate-200)', padding: '20px 20px 16px', marginBottom: 20 }}>

      {/* Inputs row */}
      {/* Money only. Months lives with boxes up in section 1 —
          it is the plan's shape, not its price — so it appears
          here as read-only context for the multiplication. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <FormField label="Monthly price" required error={formErrors.monthlyPrice}>
          <NumberField min={0} step={0.01} prefix="₾" value={form.monthlyPrice ?? ''} placeholder="50.00" error={!!formErrors.monthlyPrice}
            onChange={v => { setForm((x: any) => ({ ...x, monthlyPrice: v })); setFormErrors((e2: any) => ({ ...e2, monthlyPrice: '' })); }} />
        </FormField>
        <FormField label="Discount">
          <NumberField min={0} max={100} suffix="%" value={form.discountPercent ?? ''} placeholder="0"
            onChange={v => setForm((x: any) => ({ ...x, discountPercent: v }))} />
        </FormField>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', marginBottom: 6 }}>Charged over</label>
          <div style={{ display: 'flex', alignItems: 'center', height: 34, padding: '0 10px', borderRadius: 8, background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--slate-200b)', fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', boxSizing: 'border-box' }}>
            {pricingMonths} month{pricingMonths === 1 ? '' : 's'} · {boxCount} box{boxCount === 1 ? '' : 'es'}
          </div>
          <p style={{ fontSize: 10.5, color: 'var(--slate-400)', margin: '4px 0 0' }}>Set in step 1.</p>
        </div>
      </div>

      {/* The computed result of the three inputs above, on one
          line rather than three separate tiles. */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--slate-200b)' }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--teal-600)' }}>
            {pricingTotal > 0 ? `₾${Number.isInteger(pricingTotal) ? pricingTotal.toFixed(0) : pricingTotal.toFixed(2)}` : '₾—'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--slate-400)', marginLeft: 5 }}>total</span>
        </div>
        {pricingEffectiveMonthly > 0 && (
          <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>≈ ₾{pricingEffectiveMonthly.toFixed(2)}/month</span>
        )}
        {pricingSavings > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber-700)' }}>saves ₾{pricingSavings.toFixed(2)}</span>
        )}
        {totalCost > 0 && pricingTotal > 0 && (
          <span style={{ fontSize: 12, marginLeft: 'auto', fontWeight: 700, color: pricingTotal - totalCost < 0 ? 'var(--red-600)' : 'var(--emerald-600)' }}>
            {pricingTotal - totalCost < 0 ? '−' : '+'}₾{Math.abs(pricingTotal - totalCost).toFixed(2)} · {(((pricingTotal - totalCost) / pricingTotal) * 100).toFixed(0)}% margin
          </span>
        )}
      </div>

      {/* What is switched on under How it behaves, shown on the
          same tab as the chips so their effect is immediate
          rather than only visible over in Box Builder. */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
        {[
          { on: form.isActive && form.listed !== false, icon: '✅', label: 'Live on site', c: 'var(--emerald-600)', bg: 'var(--green-50)', b: 'var(--green-200)' },
          { on: form.autoRenewal, icon: '🔄', label: 'Auto renews', c: 'var(--teal-700)', bg: 'var(--teal-50)', b: 'var(--teal-200)' },
          { on: form.giftable, icon: '🎁', label: 'Giftable', c: 'var(--amber-700)', bg: 'var(--amber-50)', b: 'var(--amber-200)' },
          { on: cfg.deliveryFree, icon: '🚚', label: 'Free delivery', c: 'var(--teal-700)', bg: 'var(--teal-50)', b: 'var(--teal-200)' },
          { on: form.deliveryIncluded, icon: '🏷️', label: 'Delivery badge', c: 'var(--teal-700)', bg: 'var(--teal-50)', b: 'var(--teal-200)' },
        ].filter(x => x.on).map(x => (
          <span key={x.label} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: x.bg, color: x.c, border: `1px solid ${x.b}`, whiteSpace: 'nowrap' }}>
            {x.icon} {x.label}
          </span>
        ))}
      </div>
    </div>
    {/* ── 3 · How it's sold ── */}
    <StepHeading n={4} title="How it's sold" hint="The words on the pricing card" />
    <div style={{ marginBottom: 14 }}>
      <FormField label="Description" hint="One line under the plan name — optional">
        <input value={form.description || ''} onChange={e => setForm((x: any) => ({ ...x, description: e.target.value }))} placeholder="e.g. Our most popular commitment" style={inputClass()} />
      </FormField>
    </div>
    <div style={{ marginBottom: 20 }}>
      <FormField label="Benefits" required hint="The ticked list customers see on this plan's pricing card">
        <BenefitsEditor value={form.benefits} onChange={v => setForm((x: any) => ({ ...x, benefits: v }))} />
      </FormField>
    </div>

    </>
  );
}
