'use client';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { safeRedirect } from '@/lib/safeRedirect';
import LegalNotice from '@/components/LegalNotice';
import VerifyCodes from '@/components/VerifyCodes';
import PhoneInput from '@/components/ui/PhoneInput';
import { Icon } from '@/components/ui/icons';
import DogEditor from '@/components/DogEditor';
import { useModalDirty } from '@/components/ui/Modal';
import { API_URL } from '@/lib/api';
import { forgetReferral, rememberReferral, storedReferral } from '@/lib/referral';
import { FormAlert, countErrors, revealFirstError } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import IconButton from '@/components/ui/IconButton';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import AuthTabs from '@/components/AuthTabs';
import { PwEye } from '@/app/[lang]/login/LoginForm';
import { GIFT } from '@/lib/gift';

type Step = 'about' | 'account' | 'verify' | 'done';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign-up in short steps: about you (name, email, phone) → account (password,
 * invite code, consent) → confirm phone and email with codes. Then a pop-up
 * asks about the dog straight away (optional; skippable). A referral code
 * from the link (or one kept from an earlier visit) is filled in.
 */
/** Sign-up: a full page at /register, or inside the pop-up (`inModal`). */
export function RegisterForm({ inModal = false }: { inModal?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const { refresh: refreshCart } = useCart();
  const { t, lang } = useLanguage();

  const [step, setStep] = useState<Step>(params.get('step') === 'verify' ? 'verify' : 'about');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', referralCode: '' });
  const [fromLink, setFromLink] = useState(false);
  const [phoneOk, setPhoneOk] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // The link's code wins; otherwise one remembered from an earlier visit.
  useEffect(() => {
    const fromUrl = params.get('ref');
    if (fromUrl) rememberReferral(fromUrl);
    const code = fromUrl || storedReferral();
    if (code) { setForm(f => ({ ...f, referralCode: f.referralCode || code })); setFromLink(true); }
  }, [params]);

  // Half-way through sign-up in the pop-up, Esc or × asks before throwing it away.
  useModalDirty(inModal && (step === 'about' || step === 'account') && !!(form.firstName || form.lastName || form.email || form.phone || form.password));

  const set = (key: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setFieldErrors(e => ({ ...e, [key]: '' }));
  };

  function nextStep(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = t('reg.e.firstName');
    if (!form.lastName.trim()) errs.lastName = t('reg.e.lastName');
    if (!EMAIL_RE.test(form.email.trim())) errs.email = t('reg.e.email');
    if (!phoneOk) errs.phone = t(form.phone ? 'reg.e.phone' : 'ui.e.phone');
    if (countErrors(errs)) { setFieldErrors(errs); return revealFirstError(); }
    setFieldErrors({}); setError('');
    setStep('account');
    window.scrollTo({ top: 0 });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.password.length < 8) errs.password = t('reg.e.password');
    if (countErrors(errs)) { setFieldErrors(errs); return revealFirstError(); }
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
      if (!res.ok) {
        const msg = (Array.isArray(data.message) ? data.message[0] : data.message) || t('co.e.generic');
        // A problem with the name, email or phone belongs to the first step.
        if (/email|phone|name/i.test(msg)) setStep('about');
        throw new Error(msg);
      }
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

  const verified = useCallback(() => { setStep('done'); window.scrollTo({ top: 0 }); }, []);

  const steps: Step[] = ['about', 'account', 'verify'];

  return (
    <main className={inModal ? 'px-6 sm:px-8 pb-7 flex flex-col items-center' : 'min-h-[70vh] bg-gray-50 flex flex-col items-center px-4 pt-8 sm:pt-10 pb-14'}>
      {step === 'about' && <div className="w-full max-w-lg"><AuthTabs current="register" /></div>}
      <ol className="flex items-center gap-2 mb-6 text-xs" aria-label={t('aria.signupSteps')}>
        {steps.map((s, i) => {
          const at = step === 'done' ? steps.length : steps.indexOf(step);
          return (
            <li key={s} className="flex items-center gap-2" aria-current={s === step ? 'step' : undefined}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${i < at ? 'bg-teal-600 text-white' : i === at ? 'bg-teal-600 text-white ring-4 ring-teal-100' : 'bg-gray-200 text-gray-500'}`}>{i < at ? '✓' : i + 1}</span>
              <span className={`hidden sm:inline ${i === at ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{t(`reg.step.${s}`)}</span>
              {i < steps.length - 1 && <span className="w-5 h-px bg-gray-200" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <div className={inModal ? 'w-full' : 'bg-white rounded-3xl ring-1 ring-gray-200/60 p-6 sm:p-8 w-full max-w-lg'}>
        {step === 'about' && (
          <>
            <Heading kind="form" as="h1" title={t('register.heading')} subtitle={t('register.subheading')} />
            <FormAlert message={error} missing={countErrors(fieldErrors)} className="mb-4" />
            <form onSubmit={nextStep} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <Field id="firstName" label={t('register.firstName')} required autoComplete="given-name" value={form.firstName} error={fieldErrors.firstName} onChange={v => set('firstName', v)} />
                <Field id="lastName" label={t('register.lastName')} required autoComplete="family-name" value={form.lastName} error={fieldErrors.lastName} onChange={v => set('lastName', v)} />
              </div>
              <Field id="email" type="email" label={t('login.email')} required autoComplete="email" inputMode="email" value={form.email} error={fieldErrors.email} onChange={v => set('email', v)} />
              <div>
                <PhoneInput id="phone" label={t('reg.phone')} value={form.phone} required error={fieldErrors.phone} floatLabel
                  onChange={(v, ok) => { set('phone', v); setPhoneOk(ok); }} />
                {!fieldErrors.phone && <p className="mt-1 px-1 text-[11.5px] text-gray-500">{t('reg.phoneHint')}</p>}
              </div>
              <Button type="submit" size="lg" icon="arrow" label={t('reg.next')} className="mt-2" />
            </form>
          </>
        )}

        {step === 'account' && (
          <>
            <Heading kind="form" as="h1" title={t('reg.accountTitle')} subtitle={t('reg.accountSub')} />
            <FormAlert message={error} missing={countErrors(fieldErrors)} className="mb-4" />
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <Field id="password" type={showPw ? 'text' : 'password'} label={t('login.password')} required autoComplete="new-password"
                  value={form.password} error={fieldErrors.password} onChange={v => set('password', v)}
                  trailing={<PwEye shown={showPw} onToggle={() => setShowPw(v => !v)} />} />
                {!fieldErrors.password && <p className={`mt-1 px-1 text-[11.5px] ${form.password.length >= 8 ? 'text-teal-600' : 'text-gray-500'}`}>{form.password.length >= 8 ? '✓ ' : ''}{t('reg.pwHint')}</p>}
              </div>
              <ReferralField value={form.referralCode} fromLink={fromLink} onChange={v => set('referralCode', v)} />
              <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-teal-600 w-4 h-4" />
                <span>{t('reg.consent')}</span>
              </label>
              <LegalNotice />
              <div className="flex items-center gap-2 pt-1">
                <IconButton icon="undo" label={t('reg.back')} onClick={() => { setStep('about'); setError(''); }} />
                <Button type="submit" size="lg" icon="check" label={loading ? t('register.loading') : t('register.btn')} disabled={loading} />
              </div>
            </form>
          </>
        )}

        {step === 'verify' && (
          <>
            <span className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4"><Icon name="shield" className="w-6 h-6" /></span>
            <Heading kind="form" as="h1" title={t('ver.title')} subtitle={t('ver.sub')} />
            <VerifyCodes onDone={verified} />
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-6">
            <span className="inline-block text-5xl animate-[bob_2s_ease-in-out_infinite]" aria-hidden="true">🐶</span>
            <Heading kind="form" as="h1" align="center" title={t('wel.title')} subtitle={t('wel.sub')} className="mt-3" />
          </div>
        )}
      </div>

      {/* Straight after sign-up: meet the dog, in the same pop-up as everywhere else. */}
      <DogEditor open={step === 'done'} welcome onClose={() => router.push(redirect)} onSaved={() => router.push(redirect)} />
    </main>
  );
}

/**
 * The invite code as a small lilac gift card: a link-in code shows as
 * "added" with the code and a remove icon; otherwise one tap opens a short
 * code field.
 */
function ReferralField({ value, fromLink, onChange }: { value: string; fromLink: boolean; onChange: (v: string) => void }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(!!value);
  const applied = fromLink && !!value;
  return (
    <div className={`rounded-2xl ${GIFT.soft} p-3`}>
      <div className="flex items-center gap-3">
        <span className={`w-9 h-9 shrink-0 rounded-xl bg-white flex items-center justify-center ${GIFT.icon}`}><Icon name="gift" className="w-[18px] h-[18px]" /></span>
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-bold ${GIFT.text}`}>{applied ? t('reg.refApplied') : t('reg.refAsk')}</p>
          {!applied && <p className="text-[11.5px] text-gray-500">{t('reg.refAskSub')}</p>}
          {applied && <p className="text-[12px] font-mono font-bold tracking-wider text-gray-700 truncate">{value}</p>}
        </div>
        {applied
          ? <IconButton icon="close" size="sm" label={t('reg.refRemove')} onClick={() => { onChange(''); setOpen(true); }} />
          : !open && <IconButton icon="plus" size="sm" label={t('reg.refAdd')} onClick={() => setOpen(true)} />}
      </div>
      {open && !applied && (
        <input id="referralCode" aria-label={t('reg.referral')} value={value} onChange={e => onChange(e.target.value.toUpperCase().replace(/\s+/g, ''))} maxLength={40} autoFocus
          placeholder={t('reg.refPlaceholder')}
          className="mt-3 w-full h-10 rounded-full bg-white border border-lilac-100 px-4 text-[13px] font-mono font-bold tracking-wider uppercase placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:normal-case placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lilac-400" />
      )}
    </div>
  );
}

/** The full sign-up page (direct visits to /register). */
export function RegisterPage({ inModal = false }: { inModal?: boolean }) {
  return <Suspense><RegisterForm inModal={inModal} /></Suspense>;
}
