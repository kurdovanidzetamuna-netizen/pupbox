'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import DogRunner from '@/components/DogRunner';
import ErrorArt from '@/components/ErrorArt';

/** Like Chrome's dinosaur: when the internet drops, offer Pupbox Run until it's back. */
export default function OfflineGame() {
  const { t } = useLanguage();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const down = () => setOffline(true);
    const up = () => setOffline(false);
    window.addEventListener('offline', down);
    window.addEventListener('online', up);
    if (!navigator.onLine) setOffline(true);
    return () => { window.removeEventListener('offline', down); window.removeEventListener('online', up); };
  }, []);
  if (!offline) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={t('game.offline')} className="fixed inset-0 z-[70] bg-gray-900/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl ring-1 ring-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <ErrorArt scene="offline" className="w-20 h-16 shrink-0" />
            <div>
            <h2 className="text-lg font-bold text-gray-800">{t('game.offline')}</h2>
            <p className="text-sm text-gray-500">{t('game.offlineSub')}</p>
            </div>
          </div>
          <button type="button" onClick={() => setOffline(false)} className="text-sm text-gray-400 hover:text-gray-700 px-2 py-1">{t('game.close')}</button>
        </div>
        <DogRunner />
      </div>
    </div>
  );
}
