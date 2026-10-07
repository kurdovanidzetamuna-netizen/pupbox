import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { API_URL } from '@/lib/api';

async function getPost(slug: string) {
  const res = await fetch(`${API_URL}/blog/posts/${slug}`, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: 'Post not found' };
  return {
    title: post.seoTitle || `${post.title} | Pupbox Blog`,
    description: post.seoDesc || post.excerpt,
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDesc || post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: post.authorName ? [post.authorName] : undefined,
      images: post.ogImage ? [{ url: post.ogImage }] : post.featuredImage ? [{ url: post.featuredImage }] : [],
    },
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/blog/slugs`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const slugs = await res.json();
    return slugs.map((s: any) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Person', name: post.authorName || 'Pupbox Team' },
    publisher: { '@type': 'Organization', name: 'Pupbox', logo: { '@type': 'ImageObject', url: `${process.env.NEXT_PUBLIC_SITE_URL}/logo.png` } },
  };

  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />


      <article className="max-w-3xl mx-auto px-6 py-12">
        <nav className="text-sm text-gray-400 mb-8 flex gap-2">
          <Link href="/blog" className="hover:text-teal-600">Blog</Link>
          {post.category && (
            <>
              <span>/</span>
              <Link href={`/blog/category/${post.category.slug}`} className="hover:text-teal-600">{post.category.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-700 truncate">{post.title}</span>
        </nav>

        {post.category && (
          <Link href={`/blog/category/${post.category.slug}`} className="text-xs font-semibold text-teal-600 uppercase tracking-wide hover:underline">
            {post.category.name}
          </Link>
        )}
        <h1 className="text-4xl font-extrabold text-gray-900 mt-2 mb-4 leading-tight">{post.title}</h1>

        <div className="flex items-center gap-4 text-sm text-gray-400 mb-8">
          {post.authorName && <span>By <span className="text-gray-600 font-medium">{post.authorName}</span></span>}
          {post.publishedAt && (
            <span>{new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          )}
        </div>

        {post.featuredImage && (
          <div className="rounded-2xl overflow-hidden mb-10 aspect-video">
            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        {post.excerpt && <p className="text-lg text-gray-500 mb-8 font-medium leading-relaxed">{post.excerpt}</p>}

        {post.content && (
          <div className="prose prose-gray max-w-none prose-headings:font-bold prose-a:text-teal-600">
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>
        )}

        {post.tags?.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-100">
            <span className="text-sm text-gray-400 mr-3">Tags:</span>
            {post.tags.map((t: any) => (
              <span key={t.tag.id} className="inline-block bg-teal-50 text-teal-700 text-xs font-medium px-3 py-1 rounded-full mr-2 mb-2">
                {t.tag.name}
              </span>
            ))}
          </div>
        )}
      </article>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} Pupbox. Made with 🐾 in Georgia.</p>
      </footer>
    </main>
  );
}
