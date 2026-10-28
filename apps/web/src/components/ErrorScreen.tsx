'use client';
import Link from '@/components/LangLink';
import { useLanguage } from '@/context/LanguageContext';
import DogRunner from '@/components/DogRunner';
import { Heading } from '@/components/ui/Heading';
import Button from '@/components/ui/Button';
import ErrorArt from '@/components/ErrorArt';

/** The friendly page for a wrong link or a crash: what happened, and where to go next. */
export default function ErrorScreen({ kind, onRetry }: { kind: 'notFound' | 'crash'; onRetry?: () => void }) {
  const { t } = useLanguage();
  const k = kind === 'notFound' ? 'err.404' : 'err.500';
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <ErrorArt scene={kind === 'notFound' ? 'lost' : 'broken'} className="w-52 h-44 sm:w-64 sm:h-52 mb-2" />
      {kind === 'notFound' && <span className="mb-3 inline-flex h-7 items-center rounded-full bg-teal-50 px-3 text-[12px] font-extrabold tracking-[0.2em] text-teal-700">404</span>}
      <Heading align="center" title={t(`${k}.title`)} subtitle={t(`${k}.sub`)} />
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry
          ? <Button onClick={onRetry} icon="refresh" label={t('err.retry')} />
          : <Button href="/" icon="home" label={t('err.home')} />}
        <Button href="/shop" icon="bag" tone="soft" label={t('err.shop')} />
      </div>
      {/* A lost page is a good excuse for a quick game. */}
      {kind === 'notFound' && <div className="w-full max-w-xl mt-10"><DogRunner compact /></div>}
    </main>
  );
}
