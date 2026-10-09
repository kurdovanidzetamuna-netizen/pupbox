import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--slate-50)', color: 'var(--slate-700)', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 44 }}>🧭</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>This admin page doesn’t exist</h1>
      <p style={{ margin: 0, color: 'var(--slate-500)' }}>The link may be old. Everything else is in the sidebar.</p>
      <Link href="/dashboard" style={{ marginTop: 8, background: 'var(--teal-600)', color: 'var(--white)', padding: '10px 20px', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}>Back to the dashboard</Link>
    </main>
  );
}
