'use client';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { GlossyBall, GlossyBone, GlossyHeart } from '@/components/Glossy3D';

/**
 * Sign in / sign up as a pop-up. The address still changes to /login or
 * /register (so it can be shared, and Back closes it); closing goes back to
 * the page underneath. Opening that address directly shows the full page.
 * The top is a soft mint band with a happy dog and a few floating treats, so
 * the pop-up feels like Pupbox rather than an empty form.
 */
export default function AuthModal({ titleKey, size = 'sm', children }: { titleKey: string; size?: 'sm' | 'md'; children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useLanguage();
  return (
    <Modal open onClose={() => router.back()} title={t(titleKey)} size={size} header={<AuthTop />}>
      {children}
    </Modal>
  );
}

function AuthTop() {
  return (
    <div className="relative h-28 sm:h-32 mb-5 bg-pastel-mint overflow-hidden" aria-hidden="true">
      {/* Confetti dots */}
      <span className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_14%_30%,#22A38B_0_3px,transparent_4px),radial-gradient(circle_at_86%_24%,#FF5C8D_0_3px,transparent_4px),radial-gradient(circle_at_72%_78%,#7C68E0_0_3px,transparent_4px),radial-gradient(circle_at_26%_80%,#F5A623_0_3px,transparent_4px)]" />
      <img src="/images/hero/dog-6.jpg" alt=""
        className="absolute left-1/2 -translate-x-1/2 -bottom-8 sm:-bottom-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover object-[50%_35%] ring-[5px] ring-white" />
      <GlossyBone className="absolute left-[18%] top-5 w-12 h-12 sm:w-14 sm:h-14 animate-[bob_3s_ease-in-out_infinite]" />
      <GlossyBall className="absolute right-[20%] top-4 w-10 h-10 sm:w-12 sm:h-12 animate-[bob_3.4s_ease-in-out_.4s_infinite]" />
      <GlossyHeart className="absolute right-[10%] bottom-3 w-9 h-9 sm:w-10 sm:h-10 animate-[bob_3.2s_ease-in-out_.8s_infinite]" />
    </div>
  );
}
