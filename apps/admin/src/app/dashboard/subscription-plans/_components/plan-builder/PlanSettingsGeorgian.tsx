'use client';
import FormField, { inputClass } from '@/components/FormField';
import BenefitsEditor from '../ui/BenefitsEditor';
import type { PlanBuilderState } from './usePlanBuilder';

/** Georgian side of Plan Settings: read-only mirrors of the shared fields, plus the KA copy. */
export default function PlanSettingsGeorgian({ b }: { b: PlanBuilderState }) {
  const {
    formErrors, setFormErrors, form, ka, setKa, pricingMonthly, pricingDiscount,
    pricingTotal, pricingEffectiveMonthly, pricingSavings
  } = b;
  return (
    <>
    {/* ── Identity (read-only mirrors) ── */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
      {[
        { label: 'Name', value: form.name || '' },
        { label: 'Slug', value: form.slug || '' },
        { label: 'Box Count', value: String(form.boxCount ?? '') },
        { label: 'Sort Order', value: String(form.sortOrder ?? '') },
      ].map(({ label, value }) => (
        <FormField key={label} label={label}>
          <input value={value} readOnly style={{ ...inputClass(), background: 'var(--slate-50)', color: 'var(--slate-400)', cursor: 'not-allowed' }} />
        </FormField>
      ))}
      {/* Badge read-only */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700b)', marginBottom: 6 }}>Badge</label>
        <input value={form.badge || 'No badge'} readOnly style={{ ...inputClass(), background: 'var(--slate-50)', color: 'var(--slate-400)', cursor: 'not-allowed' }} />
      </div>
    </div>

    {/* ── Pricing (read-only mirrors) ── */}
    <div style={{ background: 'var(--slate-50)', borderRadius: 14, border: '1px solid var(--slate-200)', padding: '20px 20px 16px', marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pricing</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Months', value: String(form.durationValue ?? '') },
          { label: 'Monthly price (₾)', value: pricingMonthly > 0 ? `₾${pricingMonthly.toFixed(2)}` : '' },
          { label: 'Discount %', value: form.discountPercent ? String(form.discountPercent) : '0' },
        ].map(({ label, value }) => (
          <FormField key={label} label={label}>
            <input value={value} readOnly style={{ ...inputClass(), background: 'var(--slate-50)', color: 'var(--slate-400)', cursor: 'not-allowed' }} />
          </FormField>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Total price', value: pricingTotal > 0 ? `₾${pricingTotal.toFixed(2)}` : '—', highlight: true },
          { label: 'Effective / month', value: pricingEffectiveMonthly > 0 ? `₾${pricingEffectiveMonthly.toFixed(2)}` : '—', highlight: false },
          { label: 'Customer saves', value: pricingSavings > 0 ? `₾${pricingSavings.toFixed(2)}` : pricingDiscount > 0 ? '₾0.00' : '—', highlight: false, accent: pricingSavings > 0 },
        ].map(({ label, value, highlight, accent }) => (
          <div key={label} style={{ background: highlight ? 'var(--teal-50)' : 'var(--white)', border: `1px solid ${highlight ? 'var(--teal-200)' : 'var(--slate-200)'}`, borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: (accent as any) ? 'var(--teal-600)' : highlight ? 'var(--teal-600)' : 'var(--slate-700)' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>

    {/* ── Georgian text fields (editable) ── */}
    <div style={{ marginBottom: 16 }}>
      <FormField label="Name" required error={formErrors.kaName}>
        <input value={ka.name} onChange={e => { setKa((k: any) => ({ ...k, name: e.target.value })); setFormErrors((e2: any) => ({ ...e2, kaName: '' })); }} placeholder="სახელი" style={{ ...inputClass(), ...(formErrors.kaName ? { borderColor: 'var(--red-500)' } : {}) }} />
      </FormField>
    </div>
    <div style={{ marginBottom: 16 }}>
      <FormField label="Description">
        <input value={ka.description} onChange={e => setKa((k: any) => ({ ...k, description: e.target.value }))} placeholder="მოკლე აღწერა" style={inputClass()} />
      </FormField>
    </div>
    <div style={{ marginBottom: 16 }}>
      <FormField label="Benefits" hint="Georgian translations of the benefit lines">
        <BenefitsEditor value={ka.benefits} onChange={v => setKa((k: any) => ({ ...k, benefits: v }))} />
      </FormField>
    </div>
    </>
  );
}
