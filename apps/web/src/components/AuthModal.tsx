'use client';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/context/LanguageContext';

/**
 * Sign in / sign up as a pop-up. The address still changes to /login or
 * /register (so it can be shared, and Back closes it); closing goes back to
 * the page underneath. Opening that address directly shows the full page.
 */
export default function AuthModal({ titleKey, size = 'sm', children }: { titleKey: string; size?: 'sm' | 'md'; children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useLanguage();
  return (
    <Modal open onClose={() => router.back()} title={t(titleKey)} size={size} header={<div className="h-12 sm:h-14" />}>
      {children}
    </Modal>
  );
}
