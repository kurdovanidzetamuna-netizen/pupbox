'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { API_URL } from '@/lib/api';
import { storedReferral } from '@/lib/referral';
import { loadProviders, providerToken, SignInCancelled, type Provider, type Providers } from '@/lib/social';
import { FormAlert } from '@/components/ui/FormError';
import LegalNotice from '@/components/LegalNotice';

/** What the server answers after Continue with Google / Facebook. */
export interface SocialResult {
  token: string;
  created: boolean;
  user: { id: string; email: string; firstName: string; lastName: string };
  verification: { emailVerified: boolean; phoneVerified: boolean; verified: boolean };
}

/** The brands' own marks (Google's "G" in its four colours, Facebook's "f"), as their guidelines ask. */
export function GoogleMark({ className = 'w-[18px] h-[18px]' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}
export function FacebookMark({ className = 'w-[18px] h-[18px]' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

/**
 * "Continue with Google" and "Continue with Facebook", with an "or with
 * email" line under them. Shows only the providers switched on in admin, and
 * nothing at all while none are. One tap signs in, links an account with the
 * same email, or makes a new one; `onSignedIn` gets the server's answer.
 */
export default function SocialSignIn({ onSignedIn, divider = 'email', disabled }: {
  onSignedIn: (r: SocialResult) => void | Promise<void>;
  /** The line under the buttons: "or with email" (sign-in / sign-up forms) or none. */
  divider?: 'email' | 'none';
  disabled?: boolean;
}) {
  const { t, lang } = useLanguage();
  const [on, setOn] = useState<Providers | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { loadProviders().then(setOn); }, []);
  if (!on || (!on.google && !on.facebook)) return null;

  async function go(p: Provider) {
    setBusy(p); setError('');
    try {
      const token = await providerToken(p);
      const res = await fetch(`${API_URL}/auth/${p}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, language: lang, referralCode: storedReferral() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((Array.isArray(data.message) ? data.message[0] : data.message) || t('soc.failed'));
      await onSignedIn(data as SocialResult);
    } catch (e: any) {
      if (!(e instanceof SignInCancelled)) setError(e?.message && e.message !== 'script' && e.message !== 'off' ? e.message : t('soc.failed'));
    } finally { setBusy(null); }
  }

  const base = 'w-full h-12 px-5 inline-flex items-center justify-center gap-2.5 rounded-[16px] text-[14.5px] font-bold transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
  const spinner = <span className="w-[18px] h-[18px] border-2 border-current/30 border-t-current rounded-full animate-spin" aria-hidden="true" />;
  return (
    <div className="mb-5">
      <FormAlert message={error} className="mb-3" />
      <div className="grid gap-2.5">
        {on.google && (
          <button type="button" onClick={() => go('google')} disabled={!!busy || disabled} aria-busy={busy === 'google'}
            className={`${base} bg-white text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-teal-500`}>
            {busy === 'google' ? spinner : <GoogleMark />}{t('soc.google')}
          </button>
        )}
        {on.facebook && (
          <button type="button" onClick={() => go('facebook')} disabled={!!busy || disabled} aria-busy={busy === 'facebook'}
            className={`${base} bg-[#1877F2] text-white hover:bg-[#166FE5] focus-visible:ring-[#1877F2]`}>
            {busy === 'facebook' ? spinner : <FacebookMark />}{t('soc.facebook')}
          </button>
        )}
      </div>
      {/* Said before any data comes from Google / Facebook: what they agree to, and what we receive. */}
      <LegalNotice text="legal.socialNotice" className="mt-3 text-center leading-relaxed" />
      {divider === 'email' && (
        <div className="flex items-center gap-3 mt-5 text-[12px] font-semibold text-gray-400" role="separator">
          <span className="h-px flex-1 bg-gray-200" />{t('soc.orEmail')}<span className="h-px flex-1 bg-gray-200" />
        </div>
      )}
    </div>
  );
}
