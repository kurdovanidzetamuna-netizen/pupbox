'use client';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

/**
 * Shown wherever an account is created: the privacy notice has to be given
 * when personal data is collected, not only in the footer.
 */
export default function LegalNotice({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  const [before, afterTerms] = t('legal.accountNotice').split('{terms}');
  const [middle, after] = (afterTerms ?? '').split('{privacy}');
  const link = 'underline hover:text-teal-700';
  return (
    <p className={`text-xs text-gray-500 ${className}`}>
      {before}<Link href="/pages/terms" className={link}>{t('legal.termsLink')}</Link>
      {middle}<Link href="/pages/privacy" className={link}>{t('legal.privacyLink')}</Link>{after}
    </p>
  );
}
