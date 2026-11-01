'use client';
import { useEffect, useState } from 'react';
import { api, getOr } from '@/lib/api';

export type Badge = { en: string; ka: string };
const OLD_KEY = 'pupbox_badges';

/**
 * The badge labels a plan can carry, kept on the server so everyone in admin
 * sees the same list, each with its Georgian name for the site. The four
 * built-in ones can't be removed. Custom badges an earlier version kept in
 * this browser are moved to the server the first time.
 */
export function useBadges() {
  const [labels, setLabels] = useState<Badge[]>([]);
  const [error, setError] = useState('');

  const save = async (next: Badge[]) => {
    setLabels(next); setError('');
    try { setLabels(await api<Badge[]>('/admin/subscription-plans/badges', { method: 'PUT', body: { badges: next } })); }
    catch (e: any) { setError(e.message); }
  };

  useEffect(() => {
    getOr<Badge[]>('/admin/subscription-plans/badges', []).then((list) => {
      let old: string[] = [];
      try { old = JSON.parse(localStorage.getItem(OLD_KEY) || '[]'); } catch { /* nothing kept */ }
      const missing = old.filter((en) => typeof en === 'string' && en.trim() && !list.some((b) => b.en.toLowerCase() === en.trim().toLowerCase()));
      if (missing.length) save([...list, ...missing.map((en) => ({ en: en.trim(), ka: '' }))]).then(() => { try { localStorage.removeItem(OLD_KEY); } catch { /* ignore */ } });
      else setLabels(list);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    /** English names, for the plan form's badge choice. */
    badges: labels.map((b) => b.en),
    labels,
    error,
    addBadge: (en: string, ka = '') => save([...labels, { en: en.trim(), ka: ka.trim() }]),
    removeBadge: (en: string) => save(labels.filter((b) => b.en !== en)),
    setKa: (en: string, ka: string) => save(labels.map((b) => (b.en === en ? { ...b, ka } : b))),
  };
}
