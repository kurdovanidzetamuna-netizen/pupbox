import type { Metadata } from 'next';
import { howItWorksPage } from '@pupbox/content';
import { getFaq, getStoredContent, pageMetadata } from '@/lib/content';
import HowItWorksClient from './HowItWorksClient';

export const generateMetadata = () => pageMetadata(howItWorksPage);

export default async function HowItWorksPage() {
  const [content, faq] = await Promise.all([getStoredContent(howItWorksPage), getFaq()]);
  return <HowItWorksClient content={content} faq={faq} />;
}
