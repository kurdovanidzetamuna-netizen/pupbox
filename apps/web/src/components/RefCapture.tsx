'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { rememberReferral } from '@/lib/referral';

/** Keeps a ?ref= code from whichever page a referral link opened. */
export default function RefCapture() {
  const pathname = usePathname();
  useEffect(() => {
    rememberReferral(new URLSearchParams(window.location.search).get('ref'));
  }, [pathname]);
  return null;
}
