'use client';
import { useLanguage } from '@/context/LanguageContext';
import { openCookieChoice } from '@/lib/tracking';

/** Footer: change the cookie choice made on the banner. */
export default function CookieSettingsLink({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  return <button type="button" onClick={openCookieChoice} className={className}>{t('cookie.settings')}</button>;
}
