/** Numbered section heading, so a long form reads as a sequence of decisions. */
export default function StepHeading({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '0 0 12px' }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--teal-600)', color: 'var(--white)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{n}</span>
      <div>
        <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 11.5, color: 'var(--slate-400)', margin: '1px 0 0' }}>{hint}</p>
      </div>
    </div>
  );
}
