import type { Metadata } from 'next';
import { DEFAULT_FAQ } from '@pupbox/content';
import { getFaq } from '@/lib/content';
import { JsonLd } from '@/lib/jsonld';
import { T as tx, asLang, seo } from '@/lib/seo';
import FaqClient from './FaqClient';

export const generateMetadata = ({ params }: { params: { lang: string } }): Metadata => {
  const lang = asLang(params.lang);
  return seo({
    lang, path: '/faq',
    title: tx(lang, 'კითხვა-პასუხი', 'Questions & answers'),
    description: tx(lang, 'ყველაფერი Pupbox-ის ყუთების, მიწოდებისა და გეგმების შესახებ.', 'Everything about Pupbox boxes, delivery and plans.'),
  });
};

/** Every question from the FAQ manager on one page, also given to search engines as FAQ data. */
export default async function FaqPage({ params }: { params: { lang: string } }) {
  const lang = asLang(params.lang);
  const faq = await getFaq();
  const items = (faq ?? DEFAULT_FAQ)
    .map((i) => ({ q: (lang === 'ka' && i.questionKa?.trim()) || i.question, a: (lang === 'ka' && i.answerKa?.trim()) || i.answer }))
    .filter((i) => i.q?.trim() && i.a?.trim());
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: lang,
        mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
      }} />
      <FaqClient faq={faq} />
    </>
  );
}
