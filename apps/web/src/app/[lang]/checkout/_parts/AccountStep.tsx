'use client';
import LegalNotice from '@/components/LegalNotice';
import VerifyCodes from '@/components/VerifyCodes';
import PhoneOtpField from '@/components/PhoneOtpField';
import { FormAlert, countErrors } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import Button from '@/components/ui/Button';
import Segmented from '@/components/ui/Segmented';
import { PwEye } from '@/app/[lang]/login/LoginForm';

import type { Checkout } from './useCheckout';

/** Step 1 when signed out: sign up or sign in, then confirm the email and phone codes. */
export function AccountStep({ co }: { co: Checkout }) {
  const { t, loading, error, setError, errs, setErrs, isNewAccount, setIsNewAccount, needVerify, setNeedVerify, consent, setConsent, showPw, setShowPw, signupPhone, setSignupPhone, setSignupPhoneOk, signupProof, setSignupProof, next, submitAccount, input, card } = co;
  return (
    needVerify ? (
      <section className={card}>
        <Heading kind="form" as="h1" title={t('ver.title')} subtitle={t('ver.sub')} />
        <VerifyCodes onDone={() => { setNeedVerify(false); next(); }} />
      </section>
    ) : (
      <section className={card}>
        <Heading kind="form" as="h1" title={t('co.account.title')} subtitle={t('co.account.sub')} />
        {/* The same switch as the sign-in pop-up */}
        <Segmented className="mb-5" label={t('co.account.title')} value={isNewAccount ? 'new' : 'existing'}
          onChange={v => { setIsNewAccount(v === 'new'); setErrs({}); setError(''); }}
          options={[{ value: 'new', label: t('nav.signUp') }, { value: 'existing', label: t('nav.signIn') }]} />
        <form onSubmit={e => { e.preventDefault(); submitAccount(); }} className="space-y-4" noValidate>
          {isNewAccount && (
            <div className="grid grid-cols-2 gap-3">
              {input('firstName', t('co.f.firstName'), { autoComplete: 'given-name' })}
              {input('lastName', t('co.f.lastName'), { autoComplete: 'family-name' })}
            </div>
          )}
          {input('email', t('co.f.email'), { type: 'email', autoComplete: 'email' })}
          {isNewAccount && (
            <div>
              <PhoneOtpField id="signupPhone" mode="signup" label={t('reg.phone')} value={signupPhone} error={errs.signupPhone}
                confirmed={!!signupProof && signupProof.phone === signupPhone}
                onChange={(v, ok) => { setSignupPhone(v); setSignupPhoneOk(ok); setErrs(er => ({ ...er, signupPhone: '' })); }}
                onConfirmed={(c) => { setSignupProof(c); if (c) setErrs(er => ({ ...er, signupPhone: '' })); }} />
            </div>
          )}
          {input('password', t('co.f.password'), { type: showPw ? 'text' : 'password', hint: isNewAccount ? t('co.f.passwordHint') : undefined, autoComplete: isNewAccount ? 'new-password' : 'current-password',
            trailing: <PwEye shown={showPw} onToggle={() => setShowPw(v => !v)} /> })}
          {isNewAccount && (
            <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-teal-600 w-4 h-4" />
              <span>{t('reg.consent')}</span>
            </label>
          )}
          <FormAlert message={error} missing={countErrors(errs)} />
          {isNewAccount && <LegalNotice />}
          <Button type="submit" size="lg" icon="arrow" disabled={loading} label={loading ? t('co.wait') : t('co.continue').replace(/\s*→\s*$/, '')} className="!mt-6" />
        </form>
      </section>
    )
  );
}
