'use client';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import DogRunner from '@/components/DogRunner';
import { Heading } from '@/components/ui/Heading';

/** The friendly page for a wrong link or a crash: what happened, and where to go next. */
export default function ErrorScreen({ kind, onRetry }: { kind: 'notFound' | 'crash'; onRetry?: () => void }) {
  const { t } = useLanguage();
  const k = kind === 'notFound' ? 'err.404' : 'err.500';
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="text-5xl mb-5" aria-hidden="true"><span className="wag">{kind === 'notFound' ? '🐶' : '🦴'}</span></div>
      <Heading align="center" title={t(`${k}.title`)} subtitle={t(`${k}.sub`)} />
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry
          ? <button onClick={onRetry} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700">{t('err.retry')}</button>
          : <Link href="/" className="bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700">{t('err.home')}</Link>}
        <Link href="/shop" className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50">{t('err.shop')}</Link>
      </div>
      {/* A lost page is a good excuse for a quick game. */}
      {kind === 'notFound' && <div className="w-full max-w-xl mt-10"><DogRunner compact /></div>}
    </main>
  );
}
