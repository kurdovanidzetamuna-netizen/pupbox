'use client';
import { useEffect } from 'react';
import ErrorScreen from '@/components/ErrorScreen';

/** Something broke while showing a page; the header and footer stay, so the visitor isn't stranded. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <ErrorScreen kind="crash" onRetry={reset} />;
}
