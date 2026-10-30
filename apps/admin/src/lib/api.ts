/**
 * The one way admin pages talk to the API: the address, the signed-in
 * token, and what to do with an answer. A 401 or 403 is announced as
 * AUTH_EVENT; the dashboard layout signs out on 401 and shows "your role
 * doesn't allow this" on 403, for every request.
 */

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const TOKEN_KEY = 'admin_token';
export const token = () => (typeof window === 'undefined' ? '' : localStorage.getItem(TOKEN_KEY) || '');
export const saveToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const authHeaders = () => ({ Authorization: `Bearer ${token()}` });
export const jsonHeaders = () => ({ ...authHeaders(), 'Content-Type': 'application/json' });

/** The server's message for a refused request (validation sends a list: the first is enough). */
export const apiError = (d: any, fallback = 'Not saved.'): string =>
  (Array.isArray(d?.message) ? d.message[0] : d?.message) || fallback;

/** Whether the signed-in admin's role has a permission, from the token. */
export const can = (perm: string): boolean => {
  try { return (JSON.parse(atob(token().split('.')[1])).permissions ?? []).includes(perm); } catch { return false; }
};

/** Fired on window with the status (401 or 403) when the server turns the admin away. */
export const AUTH_EVENT = 'pupbox-admin:auth';
const announce = (path: string, status: number) => {
  if ((status === 401 || status === 403) && !path.startsWith('/admin/auth/login')) window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: status }));
};

/** A request the server refused; `message` is fit to show, `body` is what it sent. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: any) { super(message); }
}

type Options = { method?: string; body?: unknown; fallback?: string; signal?: AbortSignal };

/**
 * Calls the API and returns the parsed answer, or throws an ApiError with
 * the server's message (else `fallback`). A FormData body goes as an upload.
 */
export async function api<T = any>(path: string, { method = 'GET', body, fallback, signal }: Options = {}): Promise<T> {
  const form = typeof FormData !== 'undefined' && body instanceof FormData;
  const r = await fetch(`${API}${path}`, {
    method, signal,
    headers: body === undefined || form ? authHeaders() : jsonHeaders(),
    body: body === undefined ? undefined : form ? (body as FormData) : JSON.stringify(body),
  });
  announce(path, r.status);
  const d = await r.json().catch(() => (r.ok ? null : {}));
  if (!r.ok) throw new ApiError(apiError(d, fallback ?? `Not saved (error ${r.status}).`), r.status, d);
  return d as T;
}

/** For loading a screen: the answer, or `fallback` when the request fails for any reason. */
export const getOr = <T>(path: string, fallback: T): Promise<T> => api<T>(path).catch(() => fallback);

/** Hands the browser a file to save. */
export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Saves rows as a CSV that Excel opens with Georgian letters intact. */
export function saveCsv(rows: unknown[][], name: string) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  saveFile(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), name);
}

/** Today as 2026-10-30, for file names. */
export const today = () => new Date().toISOString().slice(0, 10);

/** Fetches a file from the API (a CSV export, say) and saves it; throws an ApiError when refused. */
export async function download(path: string, name: string, fallback = 'Export failed.') {
  const r = await fetch(`${API}${path}`, { headers: authHeaders() });
  announce(path, r.status);
  if (!r.ok) throw new ApiError(apiError(await r.json().catch(() => ({})), fallback), r.status, null);
  saveFile(await r.blob(), name);
}

export const post =<T = any>(path: string, body?: unknown, fallback?: string) => api<T>(path, { method: 'POST', body, fallback });
export const put = <T = any>(path: string, body?: unknown, fallback?: string) => api<T>(path, { method: 'PUT', body, fallback });
export const patch = <T = any>(path: string, body?: unknown, fallback?: string) => api<T>(path, { method: 'PATCH', body, fallback });
export const del = <T = any>(path: string, fallback?: string) => api<T>(path, { method: 'DELETE', fallback });
