export default function BuilderToast({ toast, onDismiss }: { toast: { msg: string; type: 'error' | 'success' }; onDismiss: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, display: 'flex', alignItems: 'center', gap: 10,
      background: toast.type === 'error' ? 'var(--slate-800)' : 'var(--slate-900)',
      borderLeft: `4px solid ${toast.type === 'error' ? 'var(--red-500)' : 'var(--teal-600)'}`,
      color: 'var(--white)', borderRadius: 12, padding: '12px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.28)', fontSize: 13, fontWeight: 600,
      minWidth: 280, maxWidth: 440, animation: 'slideUp 0.22s ease',
    }}>
      <span style={{ fontSize: 16 }}>{toast.type === 'error' ? '⚠️' : '✅'}</span>
      <span style={{ flex: 1 }}>{toast.msg}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px', marginLeft: 4 }}>×</button>
    </div>
  );
}
