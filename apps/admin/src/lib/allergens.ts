'use client';
import { useEffect, useState } from 'react';
import { ALLERGENS } from '@pupbox/content';
import { getOr } from '@/lib/api';

export type Allergen = { key: string; ka: string };
let cache: Promise<Allergen[]> | null = null;

/** The ready-made allergies (admin → Allergies); the built-in list until it loads. */
export function useAllergens(): Allergen[] {
  const [list, setList] = useState<Allergen[]>(ALLERGENS.map((a) => ({ key: a.key, ka: a.ka })));
  useEffect(() => { (cache ??= getOr<Allergen[]>('/allergens', [])).then((l) => { if (l.length) setList(l); }); }, []);
  return list;
}
/** After admin edits the list, the next form reads it fresh. */
export const forgetAllergens = () => { cache = null; };
