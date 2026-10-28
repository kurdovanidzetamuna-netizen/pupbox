'use client';
import Photo from '@/components/ui/Photo';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import CtaGlow from '@/components/ui/CtaGlow';
import { GlossyBall, GlossyBone, GlossyGift } from '@/components/Glossy3D';

/**
 * The other way to buy, under the plans: build your own box. A sunny card
 * with two happy dogs, the treats and toys you can pick floating round them,
 * a "New" sticker and the main glowing button.
 */
export default function BuildBoxPromo({ monthlyDiscount = 10, className = '' }: { monthlyDiscount?: number; className?: string }) {
  const { t } = useLanguage();
  return (
    <div className={`relative mt-10 max-w-4xl mx-auto overflow-hidden rounded-[32px] bg-pastel-sun px-6 py-7 sm:px-10 sm:py-9 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 text-center sm:text-left ${className}`}>
      {/* Confetti dots */}
      <span aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_12%_20%,#22A38B_0_4px,transparent_5px),radial-gradient(circle_at_88%_18%,#FF5C8D_0_4px,transparent_5px),radial-gradient(circle_at_70%_85%,#7C68E0_0_3px,transparent_4px),radial-gradient(circle_at_30%_88%,#F5A623_0_3px,transparent_4px),radial-gradient(circle_at_95%_60%,#22A38B_0_3px,transparent_4px)]" />

      {/* Happy dogs with the things you can pick */}
      <div className="group relative shrink-0 w-40 h-40 sm:w-48 sm:h-48" aria-hidden="true">
        <Photo src="/images/hero/dog-2.jpg" alt="" width={192} height={192} sizes="192px"
          className="w-full h-full rounded-full object-cover object-[55%_45%] ring-[6px] ring-white shadow-[0_18px_40px_-18px_rgba(36,48,58,0.45)]" />
        <GlossyBone className="absolute -left-6 top-2 w-14 h-14 animate-[bob_3s_ease-in-out_infinite]" />
        <GlossyBall className="absolute -right-4 -top-2 w-12 h-12 animate-[bob_3.4s_ease-in-out_.4s_infinite]" />
        <GlossyGift className="absolute -right-5 bottom-0 w-14 h-14 animate-[bob_3.2s_ease-in-out_.8s_infinite]" />
      </div>

      <div className="relative flex-1 min-w-0">
        <span className="inline-block -rotate-3 rounded-full bg-white px-3 py-1 text-[12px] font-extrabold text-teal-700 shadow-[0_6px_14px_-8px_rgba(36,48,58,0.4)]">✦ {t('ways.new')}</span>
        <h3 className="mt-3 text-[22px] sm:text-[28px] leading-tight font-extrabold text-gray-900 text-balance">{t('cb.promoTitle')}</h3>
        <p className="mt-2 text-[14.5px] sm:text-[15.5px] text-gray-700 leading-relaxed max-w-md mx-auto sm:mx-0">{fill(t('cb.promoSub'), { n: monthlyDiscount })}</p>
        <CtaGlow href="/build-box" label={t('cb.startCta')} icon="sparkle" className="mt-5" />
      </div>
    </div>
  );
}
