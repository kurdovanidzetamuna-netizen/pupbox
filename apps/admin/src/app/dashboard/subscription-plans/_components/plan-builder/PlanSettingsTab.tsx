'use client';
import LangTabs from '@/components/LangTabs';
import GeorgianIncompleteBanner from './GeorgianIncompleteBanner';
import PlanSettingsEnglish from './PlanSettingsEnglish';
import PlanSettingsGeorgian from './PlanSettingsGeorgian';
import type { PlanBuilderState } from './usePlanBuilder';

export default function PlanSettingsTab({ b }: { b: PlanBuilderState }) {
  const {
    saving, lang, setLang, formErrors, save
  } = b;
  return (
    <div>
      {formErrors.kaName && (
        <GeorgianIncompleteBanner onClick={() => setLang('ka')} style={{ marginBottom: 12 }} />
      )}
      <LangTabs lang={lang} onChange={setLang} />

      {lang === 'en' ? (
        <PlanSettingsEnglish b={b} />
      ) : (
        <PlanSettingsGeorgian b={b} />
      )}


      {formErrors.kaName && (
        <GeorgianIncompleteBanner onClick={() => setLang('ka')} style={{ marginBottom: 12 }} />
      )}
      {/* Per-tab save, matching Box Builder and Discounts. The header's
          Save All commits everything at once. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--slate-200b)', marginBottom: 24 }}>
        <button onClick={() => save()} disabled={saving}
          onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
          style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 9, padding: '8px 22px', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'background 0.15s' }}>
          {saving ? 'Saving…' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
}
