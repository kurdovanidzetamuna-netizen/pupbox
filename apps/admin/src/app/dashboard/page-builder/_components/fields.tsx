'use client';
import { useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { emptyValue, isTranslatable, type Field, type Text } from '@pupbox/content';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const input: CSSProperties = {
  width: '100%', border: '1px solid var(--slate-200)', borderRadius: 9, padding: '8px 12px',
  fontSize: 13, outline: 'none', background: 'var(--white)', boxSizing: 'border-box', fontFamily: 'inherit',
};
const label: CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 };
const help: CSSProperties = { fontSize: 11, color: 'var(--slate-400)', marginTop: 5, lineHeight: 1.45 };
const smallBtn: CSSProperties = { border: '1px solid var(--slate-200)', background: 'var(--white)', borderRadius: 7, padding: '3px 8px', fontSize: 12, cursor: 'pointer', color: 'var(--slate-600)' };

/** One field of any type. Lists render their items with this same component. */
export function FieldEditor({ field, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  if (field.type === 'note') return <Note field={field} />;
  return (
    <div>
      <span style={label}>{field.label}</span>
      {field.type === 'list' ? <ListEditor field={field} value={Array.isArray(value) ? value : []} onChange={onChange} />
        : isTranslatable(field) ? <TextPair multiline={field.type === 'textarea'} value={value as Text} onChange={onChange} />
        : field.type === 'image' ? <ImageInput value={String(value ?? '')} onChange={onChange} />
        : field.type === 'icon' ? <IconInput value={String(value ?? '')} onChange={onChange} />
        : <input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} style={input}
            placeholder={field.type === 'link' ? '/prices  or  https://…' : ''} />}
      {field.help && <p style={help}>{field.help}</p>}
    </div>
  );
}

function Note({ field }: { field: Field }) {
  return (
    <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: 'var(--amber-800)', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
      <span>{field.label}</span>
      {field.adminHref && <Link href={field.adminHref} style={{ color: 'var(--amber-800)', fontWeight: 700, whiteSpace: 'nowrap' }}>Open →</Link>}
    </div>
  );
}

/** English and Georgian side by side, so neither is forgotten. */
function TextPair({ value, onChange, multiline }: { value: Text | undefined; onChange: (v: Text) => void; multiline: boolean }) {
  const v = { en: value?.en ?? '', ka: value?.ka ?? '' };
  const kaMissing = !!v.en.trim() && !v.ka.trim();
  const box = (lang: 'en' | 'ka') => {
    const props = { value: v[lang], onChange: (e: any) => onChange({ ...v, [lang]: e.target.value }), style: { ...input, ...(lang === 'ka' && kaMissing ? { borderColor: 'var(--amber-300)' } : {}) } };
    return multiline ? <textarea rows={3} {...props} style={{ ...props.style, resize: 'vertical' }} /> : <input {...props} />;
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
      <div><span style={{ fontSize: 10, color: 'var(--slate-400)', fontWeight: 700 }}>🇬🇧 ENGLISH</span>{box('en')}</div>
      <div>
        <span style={{ fontSize: 10, color: kaMissing ? 'var(--amber-700)' : 'var(--slate-400)', fontWeight: 700 }}>🇬🇪 ქართული{kaMissing ? ' — missing, English is shown' : ''}</span>
        {box('ka')}
      </div>
    </div>
  );
}

function IconInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--slate-50)', border: '1px solid var(--slate-200b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{value || '·'}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={{ ...input, width: 90, fontSize: 18, textAlign: 'center' }} maxLength={8} aria-label="Emoji" />
      <span style={help}>Paste an emoji (Mac: Ctrl+Cmd+Space)</span>
    </div>
  );
}

export function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(f: File) {
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch(`${API}/admin/upload/image`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }, body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) throw new Error(data?.message || 'Upload failed');
      onChange(data.url);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 96, height: 72, borderRadius: 10, border: '1px solid var(--slate-200b)', background: 'var(--slate-50)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-300)', fontSize: 11 }}>
        {value ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'No image'}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => file.current?.click()} disabled={busy} style={{ ...smallBtn, background: 'var(--teal-600)', color: 'var(--white)', border: 'none', padding: '6px 12px', fontWeight: 600 }}>
            {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          </button>
          {value && <button type="button" onClick={() => onChange('')} style={{ ...smallBtn, padding: '6px 12px' }}>Remove</button>}
        </div>
        <input ref={file} type="file" accept=".jpg,.jpeg,.png,.webp,.svg" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <input value={value} onChange={(e) => onChange(e.target.value)} style={{ ...input, fontSize: 12 }} placeholder="…or paste an image link" />
        {error && <span style={{ fontSize: 12, color: 'var(--red-600)' }}>{error}</span>}
      </div>
    </div>
  );
}

/** A short label for a collapsed list item: its icon and first words. */
function summary(fields: Field[], item: Record<string, unknown>) {
  const ic = fields.find((f) => f.type === 'icon');
  const words = fields.map((f) => item[f.key]).map((v) => (typeof v === 'string' ? v : (v as Text)?.en || (v as Text)?.ka))
    .find((s, i) => fields[i].type !== 'icon' && fields[i].type !== 'image' && fields[i].type !== 'link' && typeof s === 'string' && s.trim());
  return `${ic ? String(item[ic.key] ?? '') + ' ' : ''}${words || 'New item'}`;
}

function ListEditor({ field, value, onChange }: { field: Field; value: any[]; onChange: (v: any[]) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const fields = field.item ?? [];
  const set = (i: number, item: any) => onChange(value.map((x, j) => (j === i ? item : x)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpen(open === i ? j : open === j ? i : open);
  };
  const remove = (i: number) => {
    if (!confirm(`Remove "${summary(fields, value[i])}"?`)) return;
    onChange(value.filter((_, j) => j !== i));
    setOpen(null);
  };
  const add = () => {
    const item: Record<string, unknown> = {};
    for (const f of fields) if (f.type !== 'note') item[f.key] = emptyValue(f);
    onChange([...value, item]);
    setOpen(value.length);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {value.map((item, i) => (
        <div key={i} style={{ border: '1px solid var(--slate-200b)', borderRadius: 10, background: open === i ? 'var(--white)' : 'var(--slate-50)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--slate-800)', fontWeight: 600, padding: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--slate-400)', fontWeight: 500, marginRight: 6 }}>{i + 1}.</span>{summary(fields, item)}
            </button>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} style={smallBtn} aria-label="Move up">↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} style={smallBtn} aria-label="Move down">↓</button>
            <button type="button" onClick={() => remove(i)} style={{ ...smallBtn, color: 'var(--red-600)' }} aria-label="Remove">✕</button>
          </div>
          {open === i && (
            <div style={{ borderTop: '1px solid var(--slate-100)', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {fields.map((f) => <FieldEditor key={f.key} field={f} value={item[f.key]} onChange={(v) => set(i, { ...item, [f.key]: v })} />)}
            </div>
          )}
        </div>
      ))}
      <button type="button" onClick={add} style={{ background: 'var(--teal-50)', color: 'var(--teal-600)', border: '1px dashed var(--teal-200)', borderRadius: 9, padding: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        + Add
      </button>
    </div>
  );
}
