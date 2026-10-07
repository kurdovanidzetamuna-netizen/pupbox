import { DEFAULT_BADGES } from '../_lib/constants';

/**
 * Lists every badge and lets custom ones be added or removed. The draft input
 * is owned by the page, so text typed here survives closing and reopening.
 */
export default function BadgeManagerModal({ badges, addBadge, removeBadge, input, setInput, onClose }: {
  badges: string[];
  addBadge: (label: string) => void;
  removeBadge: (label: string) => void;
  input: string;
  setInput: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--white)', borderRadius: 18, width: 480, maxWidth: '95vw', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" fill="none" stroke="var(--teal-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            Manage Badges
          </h2>
          <button onClick={() => onClose()}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--slate-600)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--slate-400)'; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.88)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '5px 7px', borderRadius: 8, transition: 'background 0.15s, color 0.15s, transform 0.1s' }}>×</button>
        </div>

        {/* Badge list — scrollable */}
        <div style={{ border: '1.5px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {badges.map((b, i) => {
              const isDefault = DEFAULT_BADGES.includes(b);
              return (
                <div key={b} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < badges.length - 1 ? '1px solid var(--slate-100)' : 'none', background: 'var(--white)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal-600)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-800)' }}>{b}</span>
                    {isDefault && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', background: 'var(--slate-100)', borderRadius: 4, padding: '1px 6px' }}>built-in</span>}
                  </div>
                  {!isDefault && (
                    <button
                      onClick={() => {
                        removeBadge(b);
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-100)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-50)'; }}
                      onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.93)'; }}
                      onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                      onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                      style={{ background: 'var(--red-50)', border: 'none', color: 'var(--red-600)', cursor: 'pointer', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px', transition: 'background 0.15s, transform 0.1s' }}
                      title="Remove badge"
                    >Remove</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add new badge */}
        <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-700b)', margin: '0 0 10px' }}>Add new badge</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') { onClose(); return; }
                if (e.key === 'Enter' && input.trim()) {
                  const label = input.trim();
                  addBadge(label);
                  setInput('');
                }
              }}
              placeholder="Badge label, e.g. Flash Sale"
              style={{ padding: '7px 12px', fontSize: 13, border: '1.5px solid var(--slate-200)', borderRadius: 9, outline: 'none', background: 'var(--white)', flex: 1 }}
            />
            <button
              onClick={() => {
                const label = input.trim();
                if (!label) return;
                addBadge(label);
                setInput('');
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
              onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'; }}
              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              style={{ padding: '7px 18px', fontSize: 13, fontWeight: 700, borderRadius: 9, border: 'none', background: 'var(--teal-600)', color: 'var(--white)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s, transform 0.1s' }}
            >+ Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
