'use client';
import { useState } from 'react';
import { DEFAULT_BADGES } from '../_lib/constants';

const STORAGE_KEY = 'pupbox_badges';

/**
 * The badge labels a plan can carry: the built-in defaults plus any custom
 * ones, which are kept in this browser's localStorage (only the custom ones
 * are stored, so a change to the defaults reaches everyone).
 */
export function useBadges() {
  const [badges, setBadges] = useState<string[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return [...new Set([...DEFAULT_BADGES, ...saved])]; }
    catch { return DEFAULT_BADGES; }
  });

  function persist(updated: string[]) {
    setBadges(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.filter(b => !DEFAULT_BADGES.includes(b)))); } catch {}
  }

  return {
    badges,
    addBadge: (label: string) => persist([...new Set([...badges, label])]),
    removeBadge: (label: string) => persist(badges.filter(b => b !== label)),
  };
}
