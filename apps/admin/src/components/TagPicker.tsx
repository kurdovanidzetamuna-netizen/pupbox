'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOr } from '@/lib/api';

type Tag = { id: string; name: string; nameKa: string; isActive: boolean };

/** Tags on a product: tap to add or take off. The list itself is kept in admin → Tags. */
export default function TagPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [tags, setTags] = useState<Tag[] | null>(null);
  useEffect(() => { getOr<Tag[]>('/admin/tags', []).then(setTags); }, []);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-label="Tags">
        {tags?.map((t) => {
          const on = value.includes(t.id);
          return (
            <button key={t.id} type="button" aria-pressed={on} onClick={() => toggle(t.id)} title={t.nameKa || undefined}
              style={{
                padding: '6px 12px', borderRadius: 99, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${on ? 'var(--teal-600)' : 'var(--slate-200)'}`, background: on ? 'var(--teal-50)' : 'var(--white)',
                color: on ? 'var(--teal-800)' : 'var(--slate-600)', opacity: t.isActive ? 1 : 0.55,
              }}>
              {on ? '✓ ' : ''}{t.name}{t.isActive ? '' : ' (off)'}
            </button>
          );
        })}
        {tags && tags.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--slate-400)' }}>No tags yet.</span>}
      </div>
      <Link href="/dashboard/tags" style={{ display: 'inline-block', marginTop: 6, fontSize: 12, color: 'var(--teal-700)' }}>Manage tags →</Link>
    </div>
  );
}
