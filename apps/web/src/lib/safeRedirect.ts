/**
 * Where to send someone after signing in. Only same-site paths are allowed:
 * `?redirect=https://evil.example` (or `//evil.example`) would otherwise turn
 * our own login page into a phishing hop.
 */
export function safeRedirect(target: string | null, fallback = '/account/orders'): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return fallback;
  return target;
}
