import { API_URL } from './api';

const TOKEN_KEY = 'pupbox_token';
/** The signed-in customer's token, or null (also on the server, where there is none). */
export const savedToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY));

/** The server's message for a refused request (validation sends a list: the first is enough). */
export const apiError = (d: any, fallback: string): string => (Array.isArray(d?.message) ? d.message[0] : d?.message) || fallback;
/** Same, read from the response. */
export const responseError = async (res: Response, fallback: string) => apiError(await res.json().catch(() => ({})), fallback);

export class SessionExpiredError extends Error {}

/**
 * GET/PATCH an account endpoint as the signed-in customer. A 401 means the
 * stored login is no longer valid: it is cleared and SessionExpiredError is
 * thrown, so pages send the customer to sign in again instead of rendering an
 * error object as if it were their data.
 */
export async function authFetch(path: string, init: RequestInit = {}) {
  const token = savedToken();
  if (!token) throw new SessionExpiredError();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    throw new SessionExpiredError();
  }
  return res;
}

/** Where to send a customer whose session ended, returning them here after. */
export function loginUrl(returnTo: string) {
  return `/login?redirect=${encodeURIComponent(returnTo)}&expired=1`;
}
