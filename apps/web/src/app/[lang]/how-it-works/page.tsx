import type { Metadata } from 'next';
import { howItWorksPage, localizePage } from '@pupbox/content';
import { getFaq, getStoredContent, pageMetadata } from '@/lib/content';
import HowItWorksClient from './HowItWorksClient';
import { JsonLd, breadcrumbs } from '@/lib/jsonld';
import { asLang } from '@/lib/seo';
export const generateMetadata = ({ params }: { params: { lang: string } }) => pageMetadata(howItWorksPage, { lang: params.lang });

export default async function HowItWorksPage({ params }: { params: { lang: string } }) {
  const lang = asLang(params.lang);
  const [content, faq] = await Promise.all([getStoredContent(howItWorksPage), getFaq()]);
  // For Google: the steps, in the visitor's language.
  const steps = (localizePage(howItWorksPage, content, lang).steps?.items ?? []) as { title?: string; desc?: string }[];
  const howTo = {
    '@type': 'HowTo',
    name: lang === 'en' ? 'How to get a monthly Pupbox for your dog' : 'როგორ მიიღო Pupbox-ის ყოველთვიური კოლოფი',
    step: steps.filter((x) => x.title).map((x, i) => ({ '@type': 'HowToStep', position: i + 1, name: x.title, ...(x.desc ? { text: x.desc } : {}) })),
  };
  return (
    <>
      {howTo.step.length > 0 && <JsonLd data={[howTo, breadcrumbs(lang, [{ name: 'Pupbox', path: '/' }, { name: lang === 'en' ? 'How it works' : 'როგორ მუშაობს', path: '/how-it-works' }])]} />}
      <HowItWorksClient content={content} faq={faq} />
    </>
  );
}
