'use client';
import { useEffect } from 'react';

interface Props {
  errors: string[];
  onClose: () => void;
}

export default function ErrorPopup({ errors, onClose }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!errors.length) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 440, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '2px solid #fecaca' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#dc2626', margin: 0 }}>Please fix the following errors</h3>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <ul style={{ margin: 0, padding: '0 0 0 20px', listStyle: 'disc' }}>
          {errors.map((e, i) => (
            <li key={i} style={{ fontSize: 13, color: '#991b1b', marginBottom: 6 }}>{e}</li>
          ))}
        </ul>
        <button
          onClick={onClose}
          style={{ marginTop: 20, width: '100%', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          OK, let me fix it
        </button>
      </div>
    </div>
  );
}
