'use client';
import { useEffect } from 'react';

/** A screen crashed; offer a retry instead of a blank page. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--slate-700)', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>This screen ran into a problem</h1>
      <p style={{ margin: 0, color: 'var(--slate-500)', maxWidth: 420 }}>Nothing was lost. Try again; if it keeps happening, note what you clicked and tell your developer.</p>
      <button onClick={reset} style={{ marginTop: 8, background: 'var(--teal-600)', color: 'var(--white)', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Try again</button>
    </main>
  );
}
