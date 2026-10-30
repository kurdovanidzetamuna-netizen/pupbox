'use client';
import { useState } from 'react';
import { Copy, Found, NAMES, code, found, inp } from './shared';

/** A box for the whole block of code a service gives you; the IDs in it fill the boxes below. */
export function PasteBox({ from, onFound }: { from: string; onFound: (f: Found) => void }) {
  const [text, setText] = useState('');
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  const take = (v: string) => {
    setText(v);
    if (!v.trim()) { setSaid(null); return; }
    const f = found(v);
    const keys = Object.keys(f) as (keyof Found)[];
    if (!keys.length) { setSaid({ ok: false, text: `No ${from} ID found in this. Copy the whole code again, or type the ID in the box below.` }); return; }
    onFound(f);
    setText('');
    setSaid({ ok: true, text: `✓ Found ${keys.map((k) => `${NAMES[k]} ${f[k]}`).join(' · ')} — filled in. Press Save.` });
  };
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-700)' }}>Paste the code from {from}</div>
      <div style={{ fontSize: 12, color: 'var(--slate-500)', margin: '1px 0 6px', lineHeight: 1.45 }}>The whole &lt;script&gt;…&lt;/script&gt; block is fine. You don’t add it to the site’s code — the site puts it on every page itself, after the visitor’s cookie choice.</div>
      <textarea value={text} onChange={(e) => take(e.target.value)} rows={3} spellCheck={false} placeholder={`<!-- ${from} code -->\n<script>…</script>`}
        style={{ ...inp, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, resize: 'vertical' }} aria-label={`Paste the code from ${from}`} />
      {said && <div role="status" style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: said.ok ? 'var(--teal-700)' : 'var(--red-600)' }}>{said.text}</div>}
    </div>
  );
}
