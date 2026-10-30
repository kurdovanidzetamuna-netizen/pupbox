import { authFetch } from '@/lib/authFetch';
import { API_URL } from '@/lib/api';


/** Can this browser get push notifications at all? (iPhone: only from the home-screen app.) */
export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration('/')) ?? navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

/** Is push on for this browser right now? */
export async function pushIsOn() {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return !!(await reg?.pushManager.getSubscription());
}

/**
 * Asks the browser, then tells the server where to send. Returns 'on',
 * 'denied' (the person said no, or blocked it in the browser), or
 * 'unavailable' (no push here, or the shop hasn't set it up).
 */
export async function turnPushOn(): Promise<'on' | 'denied' | 'unavailable'> {
  if (!pushSupported()) return 'unavailable';
  const { enabled, publicKey } = await fetch(`${API_URL}/me/push/key`).then((r) => r.json()).catch(() => ({ enabled: false }));
  if (!enabled || !publicKey) return 'unavailable';
  if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  const res = await authFetch('/me/push', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
  return res.ok ? 'on' : 'unavailable';
}

export async function turnPushOff() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await authFetch('/me/push', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
