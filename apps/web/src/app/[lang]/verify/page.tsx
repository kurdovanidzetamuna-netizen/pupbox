'use client';
import { Icon } from '@/components/ui/icons';
import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import VerifyCodes from '@/components/VerifyCodes';
import { safeRedirect } from '@/lib/safeRedirect';
import { Heading } from '@/components/ui/Heading';

/** For a customer who signed in before confirming their phone and email. */
function Verify() {
  const { t } = useLanguage();
  const router = useRouter();
  const redirect = safeRedirect(useSearchParams().get('redirect'), '/account');
  const done = useCallback(() => router.push(redirect), [router, redirect]);
  return (
    <main className="min-h-[70vh] bg-gray-50 px-4 pt-8 sm:pt-10 pb-14">
      <div className="mx-auto w-full max-w-lg bg-white rounded-3xl ring-1 ring-gray-200/60 p-6 sm:p-8">
        <span className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4"><Icon name="shield" className="w-6 h-6" /></span>
        <Heading kind="form" as="h1" title={t('ver.title')} subtitle={t('ver.sub')} />
        <VerifyCodes onDone={done} />
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return <Suspense><Verify /></Suspense>;
}
