/** Shown while the Georgian name is missing; clicking jumps to the KA fields. */
export default function GeorgianIncompleteBanner({ onClick, style }: { onClick: () => void; style?: React.CSSProperties }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--amber-100)', border: '1.5px solid var(--amber-300)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', ...style }}>
      <svg width="14" height="14" fill="none" stroke="var(--amber-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber-800)' }}>Georgian translation is incomplete — <u>click to fill it in</u></span>
    </div>
  );
}
