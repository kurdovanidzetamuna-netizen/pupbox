'use client';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { gel } from '@/lib/format';
import type { PlanLabels } from '@/lib/planLabels';

/** A friendly icon for a benefit, guessed from its words (Georgian or English). */
const ICONS: [RegExp, string, string][] = [
  // Products first: "6-10 products per box" also mentions the box.
  [/product|toy|პროდუქტ|სათამაშ/i, '🧸', 'bg-amber-50'],
  [/box|კოლოფ|ყუთ/i, '📦', 'bg-teal-50'],
  [/deliver|მიწოდ|მიტან/i, '🚚', 'bg-sky-50'],
  [/sav|%|დაზოგ|ფასდაკლ/i, '💰', 'bg-lilac-50'],
  [/cancel|გაუქმ/i, '🔓', 'bg-gray-100'],
  [/priority|პრიორიტ/i, '⚡', 'bg-amber-50'],
  [/exclusive|ექსკლუზ/i, '✨', 'bg-lilac-50'],
  [/gift|bonus|საჩუქ|ბონუს/i, '🎁', 'bg-peach-50'],
  [/message|მესიჯ|ბარათ/i, '💌', 'bg-peach-50'],
];
const iconFor = (text: string) => {
  const hit = ICONS.find(([re]) => re.test(text));
  return hit ? { emoji: hit[1], tile: hit[2] } : { emoji: '🐾', tile: 'bg-teal-50' };
};

/**
 * Everything a plan includes, as a bright pop-up: a coloured top with the
 * price and saving, quick facts, the full list as icon tiles, and Choose.
 */
export default function PlanDetails({ open, onClose, onChoose, loading, plan, name, description, benefits, badge, isGift, labels: L }: {
  open: boolean;
  onClose: () => void;
  onChoose: () => void;
  loading: boolean;
  plan: any;
  name: string;
  description: string;
  benefits: string[];
  badge?: string;
  isGift?: boolean;
  labels: PlanLabels;
}) {
  const { t } = useLanguage();
  const saving = Number(plan.discountPercent) || 0;
  const months = Number(plan.durationValue) || 0;
  const boxes = Number(plan.boxCount) || 0;
  const peach = !!isGift;

  const facts = [
    boxes > 0 && { emoji: '📦', text: fill(t(boxes === 1 ? 'plan.fact.box' : 'plan.fact.boxes'), { n: boxes }) },
    months > 0 && { emoji: '🗓️', text: fill(t(months === 1 ? 'plan.fact.month' : 'plan.fact.months'), { n: months }) },
    plan.monthlyEquivPrice && months > 1 && { emoji: '💸', text: `≈ ${gel(Number(plan.monthlyEquivPrice).toFixed(2))}${t('global.perMonth')}` },
  ].filter(Boolean) as { emoji: string; text: string }[];

  const header = (
    <div className={`relative overflow-hidden px-5 sm:px-7 pt-7 sm:pt-8 pb-6 bg-gradient-to-br ${peach ? 'from-peach-100 via-peach-50 to-lilac-100' : 'from-teal-100 via-teal-50 to-lilac-100'}`}>
      {/* Soft shapes and a few floating friends; purely decoration. */}
      <span className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-white/40" aria-hidden="true" />
      <span className="absolute -left-10 -bottom-20 w-40 h-40 rounded-full bg-white/30" aria-hidden="true" />
      <span className="absolute right-20 top-14 text-2xl opacity-80 animate-[wag_2.4s_ease-in-out_infinite]" aria-hidden="true">{peach ? '🎁' : '🐾'}</span>
      <span className="absolute right-7 bottom-6 text-3xl opacity-90 animate-[wag_3s_ease-in-out_infinite] [animation-delay:400ms]" aria-hidden="true">{peach ? '💌' : '📦'}</span>
      <span className="absolute right-24 bottom-10 text-lg opacity-60 animate-[wag_2.6s_ease-in-out_infinite] [animation-delay:800ms]" aria-hidden="true">🦴</span>

      <div className="relative max-w-[78%]">
        {badge && (
          <span className={`inline-flex items-center gap-1 mb-2 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 ${peach ? 'text-peach-600' : 'text-teal-700'}`}>
            {/^\p{Extended_Pictographic}/u.test(badge) ? badge : `⭐ ${badge}`}
          </span>
        )}
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 leading-tight">{name}</h2>
        {description && <p className="mt-1 text-[13px] text-gray-600 leading-snug">{description}</p>}
        <div className="mt-4 flex items-end gap-2.5 flex-wrap">
          <span className="text-4xl font-black tracking-tight text-gray-900 leading-none">{gel(plan.price)}</span>
          {saving > 0 && (
            <span className={`mb-0.5 text-[12px] font-extrabold px-2.5 py-1 rounded-full text-white animate-[pop_0.4s_ease-out] ${peach ? 'bg-peach-400' : 'bg-teal-500'}`}>
              −{saving}%
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={name} size="md" header={header}
      footer={
        <button type="button" onClick={onChoose} disabled={loading}
          className={`group w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-[14px] font-bold text-white transition-colors ${peach ? 'bg-peach-400 hover:bg-peach-600' : 'bg-teal-600 hover:bg-teal-700'}`}>
          {loading ? t('global.loading') : <>
            {isGift ? L.giftThis : L.chooseThis}
            <span className="opacity-70">·</span>{gel(plan.price)}
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </>}
        </button>
      }>
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {facts.map((f) => (
            <span key={f.text} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-gray-50 ring-1 ring-gray-100 text-[12.5px] font-semibold text-gray-700">
              <span aria-hidden="true">{f.emoji}</span>{f.text}
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">{L.included}</p>
      <ul className="grid sm:grid-cols-2 gap-2 pb-1">
        {benefits.map((b, i) => {
          const { emoji, tile } = iconFor(b);
          return (
            <li key={i} style={{ animationDelay: `${60 + i * 45}ms` }}
              className="flex items-center gap-3 rounded-2xl ring-1 ring-gray-100 bg-white px-3 py-2.5 opacity-0 animate-[fadeUp_0.3s_ease-out_forwards]">
              <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-lg ${tile}`} aria-hidden="true">{emoji}</span>
              <span className="text-[13px] font-medium text-gray-800 leading-snug">{b}</span>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
