const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class SessionExpiredError extends Error {}

/**
 * GET/PATCH an account endpoint as the signed-in customer. A 401 means the
 * stored login is no longer valid: it is cleared and SessionExpiredError is
 * thrown, so pages send the customer to sign in again instead of rendering an
 * error object as if it were their data.
 */
export async function authFetch(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem('pupbox_token');
  if (!token) throw new SessionExpiredError();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    localStorage.removeItem('pupbox_token');
    throw new SessionExpiredError();
  }
  return res;
}

/** Where to send a customer whose session ended, returning them here after. */
export function loginUrl(returnTo: string) {
  return `/login?redirect=${encodeURIComponent(returnTo)}&expired=1`;
}
