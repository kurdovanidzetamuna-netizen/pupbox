export default function DiscardChangesDialog({ onDiscard, onCancel }: { onDiscard: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ position: 'relative', background: 'var(--white)', borderRadius: 16, padding: '28px 32px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--orange-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 22 }}>⚠️</div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 8px' }}>Discard unsaved changes?</h3>
        <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: '0 0 24px', lineHeight: 1.5 }}>You have unsaved edits to this plan. Closing now will lose all changes.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onDiscard}
            style={{ flex: 1, background: 'var(--red-500)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >Discard & close</button>
          <button
            onClick={onCancel}
            style={{ flex: 1, background: 'var(--slate-100)', color: 'var(--slate-700)', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >Keep editing</button>
        </div>
      </div>
    </div>
  );
}
