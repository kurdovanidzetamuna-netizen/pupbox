import { API_URL } from '@/lib/api';

/**
 * Continue with Google / Facebook, on the browser side. Each provider's own
 * window asks the person to choose an account and agree, then hands us a
 * short-lived access token. The token goes to our server, which checks it
 * with Google / Facebook itself (apps/api/src/modules/auth/social.ts) — what
 * the browser says about the person is never trusted.
 *
 * Which providers are on, and their public ids, come from the server
 * (admin → Settings), so switching one on needs no new build of the site.
 */
export type Provider = 'google' | 'facebook';
export interface Providers { google: { clientId: string } | null; facebook: { appId: string } | null }

let providers: Promise<Providers> | null = null;
/** The switched-on providers, asked once per page load. */
export function loadProviders(): Promise<Providers> {
  providers ??= fetch(`${API_URL}/auth/providers`).then((r) => (r.ok ? r.json() : { google: null, facebook: null }))
    .catch(() => ({ google: null, facebook: null }));
  return providers;
}

/** The person closed the window or said no: not an error worth a red message. */
export class SignInCancelled extends Error {}

const scripts: Record<string, Promise<void>> = {};
function loadScript(src: string): Promise<void> {
  return (scripts[src] ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { delete scripts[src]; reject(new Error('script')); };
    document.head.appendChild(s);
  }));
}

declare global {
  interface Window { google?: any; FB?: any; fbAsyncInit?: () => void }
}

/** Google's account chooser (Google Identity Services), then an access token for name and email. */
export async function googleToken(clientId: string): Promise<string> {
  await loadScript('https://accounts.google.com/gsi/client');
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (r: any) => (r?.access_token ? resolve(r.access_token) : reject(r?.error === 'access_denied' ? new SignInCancelled() : new Error(r?.error || 'google'))),
      error_callback: (e: any) => reject(e?.type === 'popup_closed' ? new SignInCancelled() : new Error(e?.type || 'google')),
    });
    client.requestAccessToken({ prompt: 'select_account' });
  });
}

let fbReady: Promise<void> | null = null;
/** Facebook's login window, asking for name and email only. */
export async function facebookToken(appId: string): Promise<string> {
  fbReady ??= loadScript('https://connect.facebook.net/en_US/sdk.js').then(() => {
    window.FB.init({ appId, cookie: false, xfbml: false, version: 'v19.0' });
  }).catch((e) => { fbReady = null; throw e; });
  await fbReady;
  return new Promise((resolve, reject) => {
    window.FB.login((r: any) => (r?.authResponse?.accessToken ? resolve(r.authResponse.accessToken) : reject(new SignInCancelled())), { scope: 'public_profile,email' });
  });
}

/** The token from whichever provider. */
export async function providerToken(provider: Provider): Promise<string> {
  const p = await loadProviders();
  if (provider === 'google' && p.google) return googleToken(p.google.clientId);
  if (provider === 'facebook' && p.facebook) return facebookToken(p.facebook.appId);
  throw new Error('off');
}
