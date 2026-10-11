'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { authFetch } from '@/lib/authFetch';

export type Notice = {
  id: string;
  type: string;
  data: Record<string, any>;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

/**
 * The unread count, shared by the bell and the notifications page so marking
 * one read in either updates both. Refreshed every minute, when the tab comes
 * back into view, and after every change.
 */
let unread = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setUnread(n: number) {
  if (typeof n === 'number' && n !== unread) { unread = n; emit(); }
}

export async function refreshUnread() {
  if (!localStorage.getItem('pupbox_token')) return setUnread(0);
  try {
    const r = await authFetch('/me/notifications/unread-count');
    if (r.ok) setUnread((await r.json()).unreadCount);
  } catch { /* signed out or offline: keep what we have */ }
}

/** The live unread count; polls while any component uses it. */
export function useUnread(active = true) {
  const n = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => unread, () => 0);
  useEffect(() => {
    if (!active) return;
    refreshUnread();
    const timer = setInterval(refreshUnread, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshUnread(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [active]);
  return n;
}

/** Marks one read (or all, with no id) and updates the count. */
export async function markRead(id?: string) {
  const r = await authFetch(id ? `/me/notifications/${id}/read` : '/me/notifications/read-all', { method: 'POST' });
  if (r.ok) setUnread((await r.json()).unreadCount);
}

export async function removeNotice(id: string) {
  const r = await authFetch(`/me/notifications/${id}`, { method: 'DELETE' });
  if (r.ok) setUnread((await r.json()).unreadCount);
}
