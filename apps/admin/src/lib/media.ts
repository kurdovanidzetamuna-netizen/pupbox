'use client';
import { useEffect, useState } from 'react';

/** True on phones and tablets (the admin's bottom-tab layout, under 1024px), after the first render. */
export function useCompact(max = 1023) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${max}px)`);
    const on = () => setCompact(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [max]);
  return compact;
}
