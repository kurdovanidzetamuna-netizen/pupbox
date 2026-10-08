import type { Metadata } from 'next';
import { howItWorksPage } from '@pupbox/content';
import { getFaq, getStoredContent } from '@/lib/content';
import HowItWorksClient from './HowItWorksClient';

export const metadata: Metadata = { title: 'როგორ მუშაობს', description: 'როგორ მუშაობს Pupbox-ის ყოველთვიური კოლოფის გამოწერა.' };

export default async function HowItWorksPage() {
  const [content, faq] = await Promise.all([getStoredContent(howItWorksPage), getFaq()]);
  return <HowItWorksClient content={content} faq={faq} />;
}
