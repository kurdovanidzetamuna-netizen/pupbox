'use client';
import { GlossyBox, GlossyBone, GlossyBall, GlossyGift, GlossyHeart, GlossyPaw, GlossyPlan, GlossyBuild, GlossyBottle } from '@/components/Glossy3D';
import Caps from './Caps';
import CtaGlow from './CtaGlow';
import Button from './Button';

const ART = { box: GlossyBox, bone: GlossyBone, ball: GlossyBall, gift: GlossyGift, heart: GlossyHeart, paw: GlossyPaw, plan: GlossyPlan, build: GlossyBuild, bottle: GlossyBottle } as const;

/**
 * The one "nothing here yet" look for every page and pop-up: a soft pastel
 * circle with a glossy 3D picture that gently bobs, a title in capitals, one
 * short line and the main glowing button (plus an optional quiet second one).
 * Compact on phones; never a lonely emoji.
 */
export default function EmptyState({ art = 'box', title, text, action, second, tint = 'bg-pastel-mint', compact = false, className = '' }: {
  art?: keyof typeof ART;
  title: string;
  text?: string;
  action?: { href: string; label: string; icon?: string };
  second?: { href: string; label: string; icon?: string };
  tint?: string;
  /** A one-row card for small spots (inside a tab, a dropdown). */
  compact?: boolean;
  className?: string;
}) {
  const Art = ART[art];
  if (compact) {
    return (
      <div className={`flex items-center gap-3.5 rounded-[20px] ${tint} p-3.5 sm:p-4 ${className}`}>
        <Art className="w-14 h-14 shrink-0 animate-[bob_3s_ease-in-out_infinite]" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-extrabold text-gray-900"><Caps text={title} /></p>
          {text && <p className="text-[12.5px] text-gray-600 leading-snug mt-0.5">{text}</p>}
        </div>
        {action && <Button href={action.href} label={action.label} icon={action.icon ?? 'arrow'} size="sm" className="shrink-0" />}
      </div>
    );
  }
  return (
    <div className={`text-center px-5 py-10 sm:py-14 ${className}`}>
      <div className={`relative mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full ${tint} flex items-center justify-center`}>
        <span aria-hidden="true" className="absolute inset-0 rounded-full opacity-70 bg-[radial-gradient(circle_at_12%_30%,#22A38B_0_3px,transparent_4px),radial-gradient(circle_at_90%_22%,#FF5C8D_0_3px,transparent_4px),radial-gradient(circle_at_80%_88%,#7C68E0_0_2.5px,transparent_3.5px)]" />
        <Art className="relative w-16 h-16 sm:w-20 sm:h-20 animate-[bob_3s_ease-in-out_infinite]" />
      </div>
      <h2 className="mt-5 text-[18px] sm:text-[20px] font-extrabold text-gray-900 text-balance"><Caps text={title} /></h2>
      {text && <p className="mt-1.5 text-[13.5px] sm:text-[14px] leading-relaxed text-gray-500 max-w-sm mx-auto text-balance">{text}</p>}
      {(action || second) && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          {action && <CtaGlow href={action.href} label={action.label} icon={action.icon ?? 'box'} />}
          {second && <Button href={second.href} label={second.label} icon={second.icon} tone="soft" />}
        </div>
      )}
    </div>
  );
}
