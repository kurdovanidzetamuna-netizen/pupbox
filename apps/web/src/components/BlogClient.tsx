'use client';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/dates';
import Link from '@/components/LangLink';
import { useLanguage } from '@/context/LanguageContext';
import { blogPage, type StoredContent } from '@pupbox/content';
import { usePage } from '@/lib/usePage';
import { Heading } from '@/components/ui/Heading';
import Caps from '@/components/ui/Caps';
import CtaGlow from '@/components/ui/CtaGlow';
import { GlossyBall, GlossyBone, GlossyBox, GlossyGift, GlossyHeart, GlossyPaw } from '@/components/Glossy3D';
import { Icon } from '@/components/ui/icons';

interface Props {
  posts: any[];
  total: number;
  pages: number;
  page: number;
  categories: any[];
}

const POST_TINT = ['bg-pastel-mint', 'bg-pastel-sun', 'bg-pastel-lilac', 'bg-pastel-peach', 'bg-pastel-pink', 'bg-pastel-sky'];
const POST_ART = [GlossyPaw, GlossyBone, GlossyBall, GlossyHeart, GlossyGift, GlossyBox];

/** A post's picture, or a pastel tile with a glossy 3D icon when it has none. */
function PostImage({ post, i, className = '' }: { post: any; i: number; className?: string }) {
  const Art = POST_ART[i % POST_ART.length];
  return (
    <div className={`overflow-hidden ${post.featuredImage ? 'bg-gray-100' : POST_TINT[i % POST_TINT.length]} ${className}`}>
      {post.featuredImage
        ? <img src={post.featuredImage} alt={post.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        : <div className="w-full h-full flex items-center justify-center"><Art className="w-20 h-20 sm:w-24 sm:h-24 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-6deg]" /></div>}
    </div>
  );
}

/**
 * The blog, mobile first: categories as a chip row (sideways scroll on
 * phones), the newest post as a big featured card, the rest as clean cards,
 * a sunny "start a plan" banner and pill page numbers.
 */
export default function BlogClient({ posts, total, pages, page, categories, content, activeCategory }: Props & { content: StoredContent | null; activeCategory?: string }) {
  const { t, lang } = useLanguage();
  const c = usePage(blogPage, content);
  const local = posts.map((raw: any) => { const tr = raw.translations?.[lang] ?? {}; return { ...raw, title: tr.title?.trim() || raw.title, excerpt: tr.excerpt?.trim() || raw.excerpt }; });
  const featured = page === 1 && !activeCategory ? local[0] : null;
  const rest = featured ? local.slice(1) : local;
  const date = (d?: string) => d ? formatDate(new Date(d), lang, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const chip = (on: boolean) => `shrink-0 h-9 px-4 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-bold ring-1 ring-inset transition-colors ${on ? 'bg-teal-50 text-teal-700 ring-teal-400' : 'bg-white text-gray-600 ring-gray-200 hover:ring-gray-300'}`;

  return (
    <main className="min-h-screen bg-white">
      <div className="pt-8 sm:pt-10 px-4 sm:px-6">
        <Heading align="center" eyebrow={c.header.badge || undefined} title={c.header.heading} subtitle={c.header.description || undefined} className="!mb-6" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
        {categories.length > 0 && (
          <nav aria-label={t('blog.categories')} className="flex sm:flex-wrap sm:justify-center gap-2 mb-7 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href="/blog" className={chip(!activeCategory)}>{t('blog.allPosts')}</Link>
            {categories.map((cat: any) => (
              <Link key={cat.id} href={`/blog/category/${cat.slug}`} className={chip(activeCategory === cat.slug)}>
                {cat.name}{cat._count?.posts > 0 && <span className="text-[11px] text-gray-400">{cat._count.posts}</span>}
              </Link>
            ))}
          </nav>
        )}

        {local.length === 0 ? (
          <div className="rounded-[24px] bg-white ring-1 ring-gray-100">
            <EmptyState art="plan" tint="bg-pastel-lilac" title={c.empty.heading} text={c.empty.description}
              action={{ href: '/', label: t('global.backToHome'), icon: 'home' }} />
          </div>
        ) : (
          <>
            {featured && (
              <Link href={`/blog/${featured.slug}`} className="group grid md:grid-cols-2 gap-0 mb-6 sm:mb-8 rounded-[24px] sm:rounded-[28px] overflow-hidden bg-pastel-grey ring-1 ring-gray-100">
                <PostImage post={featured} i={0} className="aspect-[16/10] md:aspect-auto md:min-h-[300px]" />
                <div className="p-5 sm:p-8 flex flex-col justify-center">
                  {featured.category && <span className="self-start rounded-full bg-white px-2.5 py-1 text-[11.5px] font-bold text-teal-700">{featured.category.name}</span>}
                  <h2 className="mt-3 text-[20px] sm:text-[26px] leading-snug font-extrabold text-gray-900 group-hover:text-teal-700 transition-colors">{featured.title}</h2>
                  {featured.excerpt && <p className="mt-2 text-[14px] text-gray-600 leading-relaxed line-clamp-3">{featured.excerpt}</p>}
                  <div className="mt-4 flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="text-gray-400">{date(featured.publishedAt)}</span>
                    <span className="inline-flex items-center gap-1 font-bold text-teal-700">{t('blog.readMore')}<Icon name="arrow" className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></span>
                  </div>
                </div>
              </Link>
            )}

            {rest.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {rest.map((post: any, i: number) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group flex sm:block gap-3 bg-white ring-1 ring-gray-100 rounded-[22px] overflow-hidden p-2.5 sm:p-0 hover:ring-teal-200 transition">
                    <PostImage post={post} i={i + 1} className="w-28 h-28 sm:w-auto sm:h-auto shrink-0 rounded-[16px] sm:rounded-none sm:aspect-[16/10]" />
                    <div className="min-w-0 flex-1 sm:p-5 py-1 pr-1">
                      {post.category && <span className="text-[11.5px] font-bold text-teal-700">{post.category.name}</span>}
                      <h2 className="mt-0.5 text-[14.5px] sm:text-[16px] font-bold text-gray-900 line-clamp-2 group-hover:text-teal-700 transition-colors">{post.title}</h2>
                      {post.excerpt && <p className="hidden sm:block mt-1.5 text-[13px] text-gray-500 line-clamp-2 leading-relaxed">{post.excerpt}</p>}
                      <div className="mt-2 sm:mt-4 flex items-center justify-between gap-2 text-[12px]">
                        <span className="text-gray-400">{date(post.publishedAt)}</span>
                        <Icon name="arrow" className="w-4 h-4 text-teal-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {pages > 1 && (
              <nav className="flex justify-center items-center gap-1.5 mt-10" aria-label="pages">
                {page > 1 && <Link href={`/blog?page=${page - 1}`} aria-label="←" className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200"><Icon name="arrow" className="w-4 h-4 rotate-180" /></Link>}
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <Link key={p} href={`/blog?page=${p}`} aria-current={page === p ? 'page' : undefined}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold transition ${page === p ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p}</Link>
                ))}
                {page < pages && <Link href={`/blog?page=${page + 1}`} aria-label="→" className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200"><Icon name="arrow" className="w-4 h-4" /></Link>}
              </nav>
            )}
          </>
        )}

        {/* A sunny banner to start a plan, after the posts */}
        <div className="group mt-10 sm:mt-14 rounded-[24px] sm:rounded-[28px] bg-pastel-sun px-5 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
          <GlossyBox className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-6deg]" />
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[17px] sm:text-[19px] text-gray-900"><Caps text={t('blog.cta.heading')} /></p>
            <p className="mt-1 text-gray-700 text-[13.5px] leading-relaxed">{t('blog.cta.desc')}</p>
          </div>
          <CtaGlow href="/prices#plans" icon="box" label={t('blog.cta.btn')} />
        </div>
      </div>
    </main>
  );
}
