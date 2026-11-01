'use client';
import { useEffect, useState } from 'react';
import { ALLERGENS } from '@pupbox/content';
import { API_URL } from '@/lib/api';

export type Allergen = { key: string; ka: string };

/** The ready-made allergies (admin → Allergies). The built-in list until the shop's arrives. */
let current: Allergen[] = ALLERGENS.map((a) => ({ key: a.key, ka: a.ka }));
let loading: Promise<Allergen[]> | null = null;
const load = () => (loading ??= fetch(`${API_URL}/allergens`).then((r) => (r.ok ? r.json() : null)).then((l: Allergen[] | null) => {
  if (Array.isArray(l)) current = l;
  return current;
}).catch(() => { loading = null; return current; }));

/** The list, updated once the shop's own arrives. */
export function useAllergens(): Allergen[] {
  const [list, setList] = useState(current);
  useEffect(() => { load().then(setList); }, []);
  return list;
}

/** An allergy's name in the visitor's language; null when it isn't on the list (typed by hand). */
export function allergenLabel(key: string, lang: string): string | null {
  const known = current.find((x) => x.key.toLowerCase() === key.toLowerCase())
    ?? ALLERGENS.find((x) => x.key.toLowerCase() === key.toLowerCase());
  return known ? (lang === 'ka' ? known.ka || known.key : known.key) : null;
}
