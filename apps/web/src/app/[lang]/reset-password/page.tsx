'use client';
import Link from '@/components/LangLink';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveForEmails, useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { API_URL } from '@/lib/api';
import { FieldError, FormAlert, countErrors, revealFirstError } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import IconButton from '@/components/ui/IconButton';
import Button from '@/components/ui/Button';

/** Opened from the reset email: choose a new password, then you're signed in. */
function ResetForm() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const { refresh: refreshCart } = useCart();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [linkBroken, setLinkBroken] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // Read the token once, then drop it from the address bar so it isn't left
  // in history. Once: clearing the address updates `params` and re-runs this.
  const read = useRef(false);
  useEffect(() => {
    if (read.current) return;
    read.current = true;
    const tk = params.get('token') ?? '';
    setToken(tk);
    if (!tk) setLinkBroken(true);
    else window.history.replaceState(null, '', '/reset-password');
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = { pw: password.length < 8 ? t('rp.e.short') : '', pw2: password !== confirm ? t('rp.e.match') : '' };
    setFieldErrors(errs);
    if (countErrors(errs)) return revealFirstError();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setLinkBroken(true); return; }
      localStorage.setItem('pupbox_token', data.token);
      saveForEmails(lang);
      await refreshCart();
      setDone(true);
      setTimeout(() => router.push('/account'), 2500);
    } catch {
      setError(t('co.e.generic'));
    } finally {
      setLoading(false);
    }
  }

  const field = (bad?: string) => `w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${bad ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

  return (
    <main className="min-h-[70vh] bg-gray-50 flex flex-col items-center px-4 pt-8 sm:pt-10 pb-14">
      <div className="bg-white rounded-3xl ring-1 ring-gray-200/60 p-6 sm:p-8 w-full max-w-md">
        <Heading kind="form" as="h1" title={t('rp.heading')} />
        {done ? (
          <p className="text-sm text-gray-700 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3" role="status">✓ {t('rp.done')}</p>
        ) : linkBroken ? (
          <>
            <FormAlert message={t('rp.e.link')} className="mb-4" />
            <div className="flex justify-center"><Button href="/forgot-password" icon="mail" label={t('rp.newLink')} /></div>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="pw" className="block text-sm font-medium text-gray-700 mb-1">{t('rp.password')}</label>
              <input id="pw" type="password" autoComplete="new-password" value={password} aria-invalid={!!fieldErrors.pw}
                onChange={e => { setPassword(e.target.value); setError(''); setFieldErrors(f => ({ ...f, pw: '' })); }} className={field(fieldErrors.pw)} />
              {fieldErrors.pw ? <FieldError message={fieldErrors.pw} /> : <p className="text-xs text-gray-400 mt-1">{t('rp.hint')}</p>}
            </div>
            <div>
              <label htmlFor="pw2" className="block text-sm font-medium text-gray-700 mb-1">{t('rp.confirm')}</label>
              <input id="pw2" type="password" autoComplete="new-password" value={confirm} aria-invalid={!!fieldErrors.pw2}
                onChange={e => { setConfirm(e.target.value); setError(''); setFieldErrors(f => ({ ...f, pw2: '' })); }} className={field(fieldErrors.pw2)} />
              <FieldError message={fieldErrors.pw2} />
            </div>
            <FormAlert message={error} />
            <div className="flex justify-end pt-1"><IconButton type="submit" icon="arrow" tone="primary" label={loading ? t('rp.saving') : t('rp.btn')} disabled={loading} /></div>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
