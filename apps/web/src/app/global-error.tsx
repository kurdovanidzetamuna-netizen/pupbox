'use client';
import ErrorArt from '@/components/ErrorArt';

/**
 * Last resort when even the layout fails: no header, no translations
 * available, so both languages are written out here.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ka">
      <body style={{ margin: 0, fontFamily: '-apple-system, Segoe UI, Helvetica, Arial, sans-serif', background: '#f8fafc', color: '#111827' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
          <ErrorArt scene="broken" className="" />
          <h1 style={{ fontSize: 26, margin: '0 0 8px' }}>რაღაც შეფერხდა</h1>
          <p style={{ color: '#6b7280', margin: '0 0 4px' }}>Something went wrong on our side.</p>
          <p style={{ color: '#6b7280', margin: '0 0 24px' }}>სცადე თავიდან · Please try again.</p>
          <button onClick={reset} style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}>
            თავიდან ცდა · Try again
          </button>
        </main>
      </body>
    </html>
  );
}
