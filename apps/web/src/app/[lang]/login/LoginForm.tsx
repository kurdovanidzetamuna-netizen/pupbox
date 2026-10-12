'use client';
import Link from '@/components/LangLink';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveForEmails, useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { safeRedirect } from '@/lib/safeRedirect';
import { API_URL } from '@/lib/api';
import { FieldError, FormAlert, countErrors, revealFirstError } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import IconButton from '@/components/ui/IconButton';

/** The sign-in form: a full page at /login, or inside the pop-up (`inModal`). */
export function LoginForm({ inModal = false }: { inModal?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const sessionExpired = params.get('expired') === '1';
  const { refresh: refreshCart } = useCart();
  const { t, lang } = useLanguage();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = t('login.e.email');
    if (!form.password) errs.password = t('login.e.password');
    if (countErrors(errs)) { setFieldErrors(errs); return revealFirstError(); }
    setFieldErrors({});
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('co.e.generic'));
      localStorage.setItem('pupbox_token', data.token);
      saveForEmails(lang);
      await refreshCart(); // merges anything added as a guest into the account cart
      // Sign-up wasn't finished: confirm phone and email first, then carry on.
      if (data.verification && !data.verification.verified) router.push(`/verify?redirect=${encodeURIComponent(redirect)}`);
      // From the pop-up with nowhere asked: close it and stay on the same page.
      else if (inModal && !params.get('redirect')) router.back();
      else router.push(redirect);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={inModal ? 'px-6 sm:px-8 pb-7' : 'min-h-[70vh] bg-gray-50 flex flex-col items-center px-4 pt-8 sm:pt-10 pb-14'}>
      <div className={inModal ? '' : 'bg-white rounded-3xl ring-1 ring-gray-200/60 p-6 sm:p-8 w-full max-w-md'}>
        <Heading kind="form" as="h1" title={t('login.heading')} />
        {sessionExpired && !error && <p className="text-amber-800 text-sm mb-4 bg-amber-50 px-3 py-2 rounded-lg" role="status">{t('acc.sessionExpired')}</p>}
        <FormAlert message={error} className="mb-4" />
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.email')} <span className="text-red-500">*</span></label>
            <input type="email" aria-invalid={!!fieldErrors.email} value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setFieldErrors(f => ({ ...f, email: '' })); }} className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} placeholder="you@example.com" />
            <FieldError message={fieldErrors.email} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')} <span className="text-red-500">*</span></label>
            <input type="password" aria-invalid={!!fieldErrors.password} value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); setFieldErrors(f => ({ ...f, password: '' })); }} className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} placeholder="••••••••" />
            <FieldError message={fieldErrors.password} />
            <div className="text-right mt-2">
              <Link href="/forgot-password" className="text-sm text-teal-600 hover:underline">{t('login.forgot')}</Link>
            </div>
          </div>
          <div className="flex justify-end pt-1"><IconButton type="submit" icon="arrow" tone="primary" label={loading ? t('login.loading') : t('login.btn')} disabled={loading} /></div>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          {t('login.noAccount')}{' '}
          <Link href="/register" className="text-teal-600 font-medium hover:underline">{t('login.createOne')}</Link>
        </p>
      </div>
    </main>
  );
}

/** The full sign-in page (direct visits to /login). */
export function LoginPage({ inModal = false }: { inModal?: boolean }) {
  return <Suspense><LoginForm inModal={inModal} /></Suspense>;
}
