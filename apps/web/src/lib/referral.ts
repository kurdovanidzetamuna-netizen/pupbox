/**
 * A referral link (?ref=CODE) may land on any page, and people browse before
 * signing up — so the code is kept on this device for 30 days and used at
 * registration, wherever that happens (sign-up page or checkout).
 */
const KEY = 'pupbox_ref';
const DAYS = 30;

export function rememberReferral(code: string | null) {
  const c = code?.trim();
  if (!c || c.length > 40) return;
  try { localStorage.setItem(KEY, JSON.stringify({ code: c, until: Date.now() + DAYS * 86400_000 })); } catch {}
}

export function storedReferral(): string {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v?.code && v.until > Date.now()) return v.code;
  } catch {}
  return '';
}

export function forgetReferral() {
  try { localStorage.removeItem(KEY); } catch {}
}
