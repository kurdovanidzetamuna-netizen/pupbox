'use client';
import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

type Badge = { en: string; ka: string };
let cache: Promise<Badge[]> | null = null;
const load = () => (cache ??= fetch(`${API_URL}/subscription-plans/badges`).then((r) => (r.ok ? r.json() : [])).catch(() => { cache = null; return []; }));

/** A plan badge in the visitor's language (admin → Plans → Badges); the saved text when no Georgian is set. */
export function useBadgeName() {
  const [list, setList] = useState<Badge[]>([]);
  useEffect(() => { load().then(setList); }, []);
  return (badge: string, lang: string) => {
    if (lang !== 'ka') return badge;
    return list.find((b) => b.en.trim().toLowerCase() === badge.trim().toLowerCase())?.ka?.trim() || badge;
  };
}
