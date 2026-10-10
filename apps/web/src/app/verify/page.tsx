'use client';
import Link from 'next/link';
import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import VerifyCodes from '@/components/VerifyCodes';
import { safeRedirect } from '@/lib/safeRedirect';

/** For a customer who signed in before confirming their phone and email. */
function Verify() {
  const { t } = useLanguage();
  const router = useRouter();
  const redirect = safeRedirect(useSearchParams().get('redirect'), '/account');
  const done = useCallback(() => router.push(redirect), [router, redirect]);
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="text-3xl font-bold text-teal-600 mb-8">🐾 Pupbox</Link>
      <div className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-md shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('ver.title')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('ver.sub')}</p>
        <VerifyCodes onDone={done} />
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return <Suspense><Verify /></Suspense>;
}
