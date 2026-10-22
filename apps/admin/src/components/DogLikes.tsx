'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
type Cat = { id: string; name: string; parentId: string | null };
let cache: Promise<Cat[]> | null = null;
const load = () => (cache ??= fetch(`${API}/admin/categories`, { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } })
  .then((r) => (r.ok ? r.json() : [])).catch(() => { cache = null; return []; }));

/**
 * What a dog loves, as shop categories — "Toys: Chew toys, Plush · Treats (any)" —
 * for packing. Dogs added before categories were used show their older
 * food/toy words instead.
 */
export default function DogLikes({ dog, prefix = 'Loves' }: { dog: any; prefix?: string }) {
  const [cats, setCats] = useState<Cat[]>([]);
  const ids: string[] = dog?.likedCategoryIds ?? [];
  useEffect(() => { if (ids.length) load().then(setCats); }, [ids.length]);
  if (ids.length) {
    if (!cats.length) return null;
    const set = new Set(ids);
    const parts = cats.filter((c) => !c.parentId && (set.has(c.id) || cats.some((k) => k.parentId === c.id && set.has(k.id)))).map((m) => {
      const kinds = cats.filter((k) => k.parentId === m.id && set.has(k.id)).map((k) => k.name);
      return kinds.length ? `${m.name}: ${kinds.join(', ')}` : `${m.name} (any)`;
    });
    return parts.length ? <span>{prefix}: {parts.join(' · ')}</span> : null;
  }
  const old = [...(dog?.foodPreferences ?? []), ...(dog?.toyPreferences ?? [])];
  return old.length ? <span>{prefix} (older notes): {old.join(', ')}</span> : null;
}
