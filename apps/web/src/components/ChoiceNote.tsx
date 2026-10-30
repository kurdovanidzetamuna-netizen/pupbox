'use client';
import { useLanguage } from '@/context/LanguageContext';

/** "Size M · Engraving: “Rex”" under a personalised item, wherever it's listed. */
/** `choice` is a line's personalisation as the API sends it (free-form JSON). */
export default function ChoiceNote({ choice: raw, className = 'text-xs text-gray-500' }: { choice?: unknown; className?: string }) {
  const { t } = useLanguage();
  const choice = (raw && typeof raw === 'object' ? raw : null) as { engraving?: string; size?: string } | null;
  if (!choice || (!choice.engraving && !choice.size)) return null;
  const parts = [
    choice.size && `${t('pdp.p.size')} ${choice.size}`,
    choice.engraving && `${t('pdp.p.engraving')}: “${choice.engraving}”`,
  ].filter(Boolean);
  return <span className={`block ${className}`}>{parts.join(' · ')}</span>;
}
