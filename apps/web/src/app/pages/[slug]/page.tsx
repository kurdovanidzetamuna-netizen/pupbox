import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

async function getCmsPage(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cms/${slug}`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await getCmsPage(params.slug);
  if (!page) return { title: 'Page not found' };
  return {
    title: page.seoTitle || `${page.title} | Pupbox`,
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

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-teal-600">🐾 Pupbox</Link>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
          <Link href="/blog" className="hover:text-teal-600">Blog</Link>
          <Link href="/shop" className="hover:text-teal-600">Shop</Link>
          <Link href="/prices" className="hover:text-teal-600">Pricing</Link>
        </nav>
        <Link href="/subscribe" className="inline-flex items-center justify-center bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-teal-700 transition">Subscribe</Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8">{page.title}</h1>
        {content?.html ? (
          <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{ __html: content.html }} />
        ) : content?.text ? (
          <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">{content.text}</div>
        ) : (
          <p className="text-gray-400">This page has no content yet.</p>
        )}
      </div>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} Pupbox. Made with 🐾 in Georgia.</p>
      </footer>
    </main>
  );
}
