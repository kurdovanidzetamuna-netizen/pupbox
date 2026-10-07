export default function Pill({ bg, color, border, children }: any) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color, border }}>{children}</span>;
}
