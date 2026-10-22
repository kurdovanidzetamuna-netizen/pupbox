'use client';

type Group = 'BOX_TYPES' | 'OTHER';

/**
 * Which kinds of plan the pricing page shows: the Mini / Standard / Premium
 * plans, the plans without a box type, or both. One switch per group; each
 * plan can still be shown or hidden on its own. Hidden plans keep renewing
 * for the people already on them.
 */
export default function SiteVisibility({ plans, busy, onChange }: {
  plans: any[];
  busy: Group | null;
  onChange: (group: Group, listed: boolean) => void;
}) {
  const live = plans.filter((p) => p.isActive);
  const groups: { id: Group; title: string; sub: string; plans: any[] }[] = [
    { id: 'BOX_TYPES', title: 'Box types', sub: 'Mini, Standard, Premium — each by length', plans: live.filter((p) => p.tierId) },
    { id: 'OTHER', title: 'Plans without a box type', sub: 'Shown under “More plans”', plans: live.filter((p) => !p.tierId) },
  ];

  return (
    <section style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
      <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>On the pricing page</h2>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 12px' }}>Hidden plans can’t be bought, but people already on them keep renewing.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {groups.map((g) => {
          const shown = g.plans.filter((p) => p.listed !== false).length;
          const on = shown > 0;
          const state = !g.plans.length ? 'No plans' : shown === g.plans.length ? `All ${shown} shown` : shown ? `${shown} of ${g.plans.length} shown` : `All ${g.plans.length} hidden`;
          const disabled = !g.plans.length || busy !== null;
          return (
            <button key={g.id} type="button" role="switch" aria-checked={on} disabled={disabled}
              // Some shown counts as on: one tap hides the rest of the group too.
              onClick={() => onChange(g.id, !on)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: disabled ? 'default' : 'pointer',
                border: `1.5px solid ${on ? 'var(--teal-200)' : 'var(--slate-200)'}`, background: on ? 'var(--teal-50)' : 'var(--slate-50)', opacity: busy === g.id ? 0.6 : 1, transition: 'background 0.15s, border-color 0.15s' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--slate-900)' }}>{g.title}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--slate-500)', marginTop: 1 }}>{g.sub}</span>
                <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: on ? 'var(--teal-700)' : 'var(--slate-400)', marginTop: 4 }}>{state}</span>
              </span>
              <span aria-hidden="true" style={{ flexShrink: 0, width: 42, height: 24, borderRadius: 999, background: on ? 'var(--teal-600)' : 'var(--slate-300)', position: 'relative', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: 'var(--white)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
