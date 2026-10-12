import Link from '@/components/LangLink';
import T from '@/components/T';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { API_URL } from '@/lib/api';
import { Heading } from '@/components/ui/Heading';
import ShareButtons from '@/components/ShareButtons';
import { JsonLd, ORG, breadcrumbs } from '@/lib/jsonld';
import { SITE_URL, T as tx, asLang, atLang, seo, type Lang } from '@/lib/seo';

async function getPost(slug: string) {
  const res = await fetch(`${API_URL}/blog/posts/${slug}`, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  return res.json();
}

/** The post in the page's language: its translation where there is one, else the post as written. */
function inLang(post: any, lang: Lang) {
  const tr = post.translations?.[lang] ?? {};
  const pick = (k: string) => (typeof tr[k] === 'string' && tr[k].trim()) || post[k];
  return { title: pick('title'), excerpt: pick('excerpt'), content: pick('content'), seoTitle: tr.seoTitle?.trim() || post.seoTitle, seoDesc: tr.seoDesc?.trim() || post.seoDesc };
}

export async function generateMetadata({ params }: { params: { slug: string; lang: string } }): Promise<Metadata> {
  const lang = asLang(params.lang);
  const post = await getPost(params.slug);
  if (!post) return { title: tx(lang, 'გვერდი ვერ მოიძებნა', 'Page not found'), robots: { index: false } };
  const p = inLang(post, lang);
  return seo({
    lang, path: `/blog/${post.slug}`, type: 'article',
    title: (p.seoTitle || p.title).replace(/\s*\|\s*Pupbox.*$/i, ''),
    description: p.seoDesc || p.excerpt,
    photo: post.ogImage || post.featuredImage,
    sub: tx(lang, 'Pupbox ბლოგი', 'Pupbox blog'),
    publishedTime: post.publishedAt, modifiedTime: post.updatedAt,
  });
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

export default async function BlogPostPage({ params }: { params: { slug: string; lang: string } }) {
  const lang = asLang(params.lang);
  const post = await getPost(params.slug);
  if (!post) notFound();
  const p = inLang(post, lang);
  const url = `${SITE_URL}${atLang(`/blog/${post.slug}`, lang)}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.excerpt,
      image: post.featuredImage ? [post.featuredImage] : undefined,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      inLanguage: lang,
      mainEntityOfPage: url,
      url,
      author: { '@type': 'Organization', name: post.authorName || 'Pupbox' },
      publisher: ORG,
    },
    breadcrumbs(lang, [
      { name: 'Pupbox', path: '/' },
      { name: tx(lang, 'ბლოგი', 'Blog'), path: '/blog' },
      ...(post.category ? [{ name: post.category.name, path: `/blog/category/${post.category.slug}` }] : []),
      { name: p.title, path: `/blog/${post.slug}` },
    ]),
  ];

  return (
    <main className="min-h-screen bg-white">
      <JsonLd data={jsonLd} />


      <article className="max-w-3xl mx-auto px-6 pt-8 sm:pt-10 pb-14">
        <nav className="text-sm text-gray-400 mb-8 flex gap-2">
          <Link href="/blog" className="hover:text-teal-600"><T k="crumb.blog" /></Link>
          {post.category && (
            <>
              <span>/</span>
              <Link href={`/blog/category/${post.category.slug}`} className="hover:text-teal-600">{post.category.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-700 truncate">{p.title}</span>
        </nav>

        {post.category && (
          <Link href={`/blog/category/${post.category.slug}`} className="text-xs font-semibold text-teal-600 uppercase tracking-wide hover:underline">
            {post.category.name}
          </Link>
        )}
        <Heading title={p.title} as="h1" className="mt-2 !mb-3" />

        <div className="flex items-center gap-4 text-sm text-gray-400 mb-8">
          {post.authorName && <span className="text-gray-600 font-medium">{post.authorName}</span>}
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ka-GE', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
          )}
        </div>

        {post.featuredImage && (
          <div className="rounded-2xl overflow-hidden mb-10 aspect-video">
            <img src={post.featuredImage} alt={p.title} className="w-full h-full object-cover" />
          </div>
        )}

        {p.excerpt && <p className="text-lg text-gray-500 mb-8 font-medium leading-relaxed">{p.excerpt}</p>}

        {p.content && (
          <div className="prose prose-gray max-w-none prose-headings:font-bold prose-a:text-teal-600">
            <div dangerouslySetInnerHTML={{ __html: p.content }} />
          </div>
        )}

        {post.tags?.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-100">
            <span className="text-sm text-gray-400 mr-3"><T k="blog.tags" />:</span>
            {post.tags.map((t: any) => (
              <span key={t.tag.id} className="inline-block bg-teal-50 text-teal-700 text-xs font-medium px-3 py-1 rounded-full mr-2 mb-2">
                {t.tag.name}
              </span>
            ))}
          </div>
        )}
        <ShareButtons title={p.title} className="mt-10 pt-6 border-t border-gray-100" />
      </article>

    </main>
  );
}
