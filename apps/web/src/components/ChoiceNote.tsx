'use client';
import { useLanguage } from '@/context/LanguageContext';

/** "Size M · Engraving: “Rex”" under a personalised item, wherever it's listed. */
export default function ChoiceNote({ choice, className = 'text-xs text-gray-500' }: { choice?: { engraving?: string; size?: string } | null; className?: string }) {
  const { t } = useLanguage();
  if (!choice || (!choice.engraving && !choice.size)) return null;
  const parts = [
    choice.size && `${t('pdp.p.size')} ${choice.size}`,
    choice.engraving && `${t('pdp.p.engraving')}: “${choice.engraving}”`,
  ].filter(Boolean);
  return <span className={`block ${className}`}>{parts.join(' · ')}</span>;
}
