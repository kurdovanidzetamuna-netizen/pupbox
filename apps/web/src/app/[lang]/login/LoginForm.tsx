'use client';
import Link from '@/components/LangLink';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveForEmails, useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { safeRedirect } from '@/lib/safeRedirect';
import { API_URL } from '@/lib/api';
import { FormAlert, countErrors, revealFirstError } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import AuthTabs from '@/components/AuthTabs';
import { Icon } from '@/components/ui/icons';

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
  const [showPw, setShowPw] = useState(false);

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
        <AuthTabs current="login" />
        <Heading kind="form" as="h1" title={t('login.heading')} />
        {sessionExpired && !error && <p className="text-amber-800 text-sm mb-4 bg-amber-50 px-3 py-2 rounded-lg" role="status">{t('acc.sessionExpired')}</p>}
        <FormAlert message={error} className="mb-4" />
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <Field id="login-email" type="email" label={t('login.email')} required autoComplete="email" inputMode="email"
            value={form.email} error={fieldErrors.email}
            onChange={v => { setForm({ ...form, email: v }); setFieldErrors(f => ({ ...f, email: '' })); }} />
          <div>
            <Field id="login-password" type={showPw ? 'text' : 'password'} label={t('login.password')} required autoComplete="current-password"
              value={form.password} error={fieldErrors.password}
              onChange={v => { setForm({ ...form, password: v }); setFieldErrors(f => ({ ...f, password: '' })); }}
              trailing={<PwEye shown={showPw} onToggle={() => setShowPw(v => !v)} />} />
            <div className="text-right mt-2">
              <Link href="/forgot-password" className="text-sm text-teal-600 hover:underline">{t('login.forgot')}</Link>
            </div>
          </div>
          <Button type="submit" size="lg" label={loading ? t('login.loading') : t('login.btn')} disabled={loading} className="mt-2" />
        </form>
      </div>
    </main>
  );
}

/** Show / hide the password, as a small icon inside the shared field. */
export function PwEye({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  const { t } = useLanguage();
  return (
    <button type="button" onClick={onToggle} aria-pressed={shown} aria-label={t(shown ? 'reg.hidePw' : 'reg.showPw')} title={t(shown ? 'reg.hidePw' : 'reg.showPw')}
      className="-mr-1 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-teal-700 hover:bg-teal-50 transition-colors">
      <Icon name={shown ? 'eyeOff' : 'eye'} className="w-[18px] h-[18px]" />
    </button>
  );
}

/** The full sign-in page (direct visits to /login). */
export function LoginPage({ inModal = false }: { inModal?: boolean }) {
  return <Suspense><LoginForm inModal={inModal} /></Suspense>;
}
