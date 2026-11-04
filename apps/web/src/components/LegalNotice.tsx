'use client';
import Link from '@/components/LangLink';
import { useLanguage } from '@/context/LanguageContext';

/**
 * Shown wherever an account is created: the privacy notice has to be given
 * when personal data is collected, not only in the footer. `text` picks the
 * wording (Google / Facebook sign-up also says what we receive from them).
 */
export default function LegalNotice({ className = '', text = 'legal.accountNotice' }: { className?: string; text?: 'legal.accountNotice' | 'legal.socialNotice' }) {
  const { t } = useLanguage();
  const [before, afterTerms] = t(text).split('{terms}');
  const [middle, after] = (afterTerms ?? '').split('{privacy}');
  const link = 'underline hover:text-teal-700';
  return (
    <p className={`text-xs text-gray-500 ${className}`}>
      {before}<Link href="/pages/terms" className={link}>{t('legal.termsLink')}</Link>
      {middle}<Link href="/pages/privacy" className={link}>{t('legal.privacyLink')}</Link>{after}
    </p>
  );
}
