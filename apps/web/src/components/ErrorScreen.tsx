'use client';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

/** The friendly page for a wrong link or a crash: what happened, and where to go next. */
export default function ErrorScreen({ kind, onRetry }: { kind: 'notFound' | 'crash'; onRetry?: () => void }) {
  const { t } = useLanguage();
  const k = kind === 'notFound' ? 'err.404' : 'err.500';
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-6xl mb-6" aria-hidden="true">{kind === 'notFound' ? '🐾' : '🦴'}</div>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-3">{t(`${k}.title`)}</h1>
      <p className="text-gray-500 max-w-md mb-8">{t(`${k}.sub`)}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry
          ? <button onClick={onRetry} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700">{t('err.retry')}</button>
          : <Link href="/" className="bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700">{t('err.home')}</Link>}
        <Link href="/shop" className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50">{t('err.shop')}</Link>
      </div>
    </main>
  );
}
