import type { Metadata } from 'next';
import { asLang, seo } from '@/lib/seo';
import PreviewClient from './PreviewClient';

/** A design preview for the owner only: kept out of search results. */
export const generateMetadata = ({ params }: { params: { lang: string } }): Metadata =>
  seo({ lang: asLang(params.lang), path: '/preview', title: 'Design preview', description: 'Pupbox design preview.', noindex: true });

export default function Page() {
  return <PreviewClient />;
}
