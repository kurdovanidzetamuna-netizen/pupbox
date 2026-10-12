import type { Metadata } from 'next';
import { getFaq } from '@/lib/content';
import FaqClient from './FaqClient';

export const metadata: Metadata = {
  title: 'კითხვა-პასუხი',
  description: 'ყველაფერი Pupbox-ის ყუთების, მიწოდებისა და გეგმების შესახებ.',
};

/** Every question from the FAQ manager on one page; linked from the footer and the menu. */
export default async function FaqPage() {
  return <FaqClient faq={await getFaq()} />;
}
