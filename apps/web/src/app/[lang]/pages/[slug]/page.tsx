import { T as tx, asLang, seo } from '@/lib/seo';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import CmsContent from './CmsContent';
import { API_URL } from '@/lib/api';

async function getCmsPage(slug: string) {
  try {
    const res = await fetch(`${API_URL}/cms/${slug}`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string; lang: string } }): Promise<Metadata> {
  const lang = asLang(params.lang);
  const page = await getCmsPage(params.slug);
  if (!page) return { title: tx(lang, 'გვერდი ვერ მოიძებნა', 'Page not found'), robots: { index: false } };
  const tr = page.translations?.[lang] ?? {};
  const title = (tr.seoTitle || tr.title || page.seoTitle || page.title).replace(/\s*\|\s*Pupbox\s*$/i, '');
  return seo({ lang, path: `/pages/${page.slug}`, title, description: tr.seoDesc || page.seoDesc, photo: page.ogImage });
}

export default async function CmsPage({ params }: { params: { slug: string } }) {
  const page = await getCmsPage(params.slug);
  if (!page || page.status !== 'PUBLISHED') notFound();

  const content = page.content as any;
  const ka = (page.translations as any)?.ka;

  // The site header and language come from the root layout; this page used to
  // draw a second header (and footer) of its own underneath it.
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-14">
        <CmsContent title={page.title} html={content?.html} text={content?.text} kaTitle={ka?.title} kaHtml={ka?.html} />
      </div>
    </main>
  );
}
