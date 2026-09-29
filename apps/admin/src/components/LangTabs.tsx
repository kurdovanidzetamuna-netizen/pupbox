'use client';

export type Lang = 'en' | 'ka';

interface LangTabsProps {
  lang: Lang;
  onChange: (l: Lang) => void;
}

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ka', flag: '🇬🇪', label: 'Georgian' },
];

export default function LangTabs({ lang, onChange }: LangTabsProps) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '3px', background: 'var(--slate-100)', borderRadius: 10, width: 'fit-content', marginBottom: 18 }}>
      {LANGS.map(l => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: lang === l.code ? 'var(--white)' : 'transparent',
            color: lang === l.code ? 'var(--teal-600)' : 'var(--slate-400)',
            boxShadow: lang === l.code ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 14 }}>{l.flag}</span>
          {l.label}
        </button>
      ))}
    </div>
  );
}

/** Helper: get a translated field value, falling back to the English (base) value */
export function t(base: string | undefined, translations: any, lang: Lang, field: string): string {
  if (lang === 'en') return base || '';
  return (translations?.ka?.[field]) || base || '';
}
