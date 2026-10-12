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

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await getCmsPage(params.slug);
  if (!page) return { title: 'გვერდი ვერ მოიძებნა' };
  return {
    // The root layout's title template already appends "| Pupbox".
    title: (page.seoTitle || page.title).replace(/\s*\|\s*Pupbox\s*$/i, ''),
    description: page.seoDesc,
    openGraph: {
      title: page.seoTitle || page.title,
      description: page.seoDesc,
      images: page.ogImage ? [{ url: page.ogImage }] : [],
    },
    alternates: { canonical: `/pages/${page.slug}` },
  };
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
