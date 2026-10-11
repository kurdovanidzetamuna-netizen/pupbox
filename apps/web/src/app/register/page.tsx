'use client';
import Link from 'next/link';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { safeRedirect } from '@/lib/safeRedirect';
import LegalNotice from '@/components/LegalNotice';
import VerifyCodes from '@/components/VerifyCodes';
import { Icon } from '@/components/ui/icons';
import DogProfileForm, { emptyDogProfile, toDogPayload, type DogProfile } from '@/components/DogProfileForm';
import { API_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { forgetReferral, rememberReferral, storedReferral } from '@/lib/referral';

type Step = 'details' | 'verify' | 'dog';
const PHONE_RE = /^(\+?995)?\s*5[\d\s-]{8,11}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign-up in three steps: details → confirm phone and email with codes →
 * the dog (optional; skippable). A referral code from the link (or one kept
 * from an earlier visit) is filled in but stays editable.
 */
function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const { refresh: refreshCart } = useCart();
  const { t, lang } = useLanguage();

  const [step, setStep] = useState<Step>(params.get('step') === 'verify' ? 'verify' : 'details');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', referralCode: '' });
  const [fromLink, setFromLink] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [dog, setDog] = useState<DogProfile>(emptyDogProfile);

  // The link's code wins; otherwise one remembered from an earlier visit.
  useEffect(() => {
    const fromUrl = params.get('ref');
    if (fromUrl) rememberReferral(fromUrl);
    const code = fromUrl || storedReferral();
    if (code) { setForm(f => ({ ...f, referralCode: f.referralCode || code })); setFromLink(true); }
  }, [params]);

  const set = (key: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setFieldErrors(e => ({ ...e, [key]: '' }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = t('reg.e.firstName');
    if (!form.lastName.trim()) errs.lastName = t('reg.e.lastName');
    if (!EMAIL_RE.test(form.email.trim())) errs.email = t('reg.e.email');
    if (!PHONE_RE.test(form.phone.trim())) errs.phone = t('reg.e.phone');
    if (form.password.length < 8) errs.password = t('reg.e.password');
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim(),
          referralCode: form.referralCode.trim() || undefined, marketingConsent: consent, language: lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((Array.isArray(data.message) ? data.message[0] : data.message) || t('co.e.generic'));
      localStorage.setItem('pupbox_token', data.token);
      forgetReferral();
      await refreshCart(); // merges anything added as a guest into the account cart
      setStep('verify');
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const verified = useCallback(() => { setStep('dog'); window.scrollTo({ top: 0 }); }, []);

  async function saveDog() {
    if (!dog.name.trim()) { setFieldErrors({ dogName: t('co.e.dogName') }); return; }
    setLoading(true); setError('');
    try {
      const res = await authFetch('/me/dogs', { method: 'POST', body: JSON.stringify(toDogPayload(dog)) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || t('co.e.generic'));
      router.push(redirect);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const field = (key: string) => `w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${fieldErrors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;
  const err = (key: string) => fieldErrors[key] && <p className="text-red-500 text-xs mt-1">⚠ {fieldErrors[key]}</p>;
  const steps: Step[] = ['details', 'verify', 'dog'];

  return (
    <main className="min-h-[70vh] bg-gray-50 flex flex-col items-center px-4 pt-8 sm:pt-12 pb-16">
      <ol className="flex items-center gap-2 mb-6 text-xs" aria-label={t('aria.signupSteps')}>
        {steps.map((s, i) => {
          const at = steps.indexOf(step);
          return (
            <li key={s} className="flex items-center gap-2" aria-current={s === step ? 'step' : undefined}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${i < at ? 'bg-teal-600 text-white' : i === at ? 'bg-teal-600 text-white ring-4 ring-teal-100' : 'bg-gray-200 text-gray-500'}`}>{i < at ? '✓' : i + 1}</span>
              <span className={i === at ? 'font-semibold text-gray-900' : 'text-gray-400'}>{t(`reg.step.${s}`)}</span>
              {i < steps.length - 1 && <span className="w-5 h-px bg-gray-200" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <div className="bg-white rounded-3xl ring-1 ring-gray-200/60 p-6 sm:p-8 w-full max-w-lg">
        {step === 'details' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('register.heading')}</h1>
            <p className="text-sm text-gray-500 mb-6">{t('register.subheading')}</p>
            {error && <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg" role="alert">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">{t('register.firstName')} <span className="text-red-500">*</span></label>
                  <input id="firstName" autoComplete="given-name" value={form.firstName} onChange={e => set('firstName', e.target.value)} className={field('firstName')} />
                  {err('firstName')}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">{t('register.lastName')} <span className="text-red-500">*</span></label>
                  <input id="lastName" autoComplete="family-name" value={form.lastName} onChange={e => set('lastName', e.target.value)} className={field('lastName')} />
                  {err('lastName')}
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t('login.email')} <span className="text-red-500">*</span></label>
                <input id="email" type="email" autoComplete="email" value={form.email} onChange={e => set('email', e.target.value)} className={field('email')} placeholder="anna@example.com" />
                {err('email')}
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">{t('reg.phone')} <span className="text-red-500">*</span></label>
                <input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={field('phone')} placeholder="599 12 34 56" />
                {fieldErrors.phone ? err('phone') : <p className="text-xs text-gray-400 mt-1">{t('reg.phoneHint')}</p>}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')} <span className="text-red-500">*</span></label>
                <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={e => set('password', e.target.value)} className={field('password')} placeholder="••••••••" />
                {err('password')}
              </div>
              <div>
                <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-1">{t('reg.referral')}</label>
                <input id="referralCode" value={form.referralCode} onChange={e => set('referralCode', e.target.value)} className={field('referralCode')} maxLength={40} />
                {fromLink && form.referralCode && <p className="text-xs text-green-700 mt-1">🎁 {t('reg.referralFrom')}</p>}
              </div>
              <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-teal-600 w-4 h-4" />
                <span>{t('reg.consent')}</span>
              </label>
              <LegalNotice />
              <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-50">
                {loading ? t('register.loading') : t('register.btn')}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
              {t('register.haveAccount')}{' '}
              <Link href="/login" className="text-teal-600 font-medium hover:underline">{t('register.signIn')}</Link>
            </p>
          </>
        )}

        {step === 'verify' && (
          <>
            <span className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4"><Icon name="shield" className="w-6 h-6" /></span>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{t('ver.title')}</h1>
            <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">{t('ver.sub')}</p>
            <VerifyCodes onDone={verified} />
          </>
        )}

        {step === 'dog' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('wel.title')}</h1>
            <p className="text-sm text-gray-500 mb-6">{t('wel.sub')}</p>
            <DogProfileForm value={dog} onChange={d => { setDog(d); setFieldErrors({}); }} compact nameError={fieldErrors.dogName} />
            {error && <p className="text-red-500 text-sm mt-4" role="alert">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => router.push(redirect)} className="border border-gray-200 text-gray-600 px-5 py-3 rounded-xl font-medium hover:bg-gray-50">{t('wel.skip')}</button>
              <button type="button" onClick={saveDog} disabled={loading} className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50">{loading ? t('co.saving') : t('wel.save')}</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
