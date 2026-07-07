'use client';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  posts: any[];
  total: number;
  pages: number;
  page: number;
  categories: any[];
}

export default function BlogClient({ posts, total, pages, page, categories }: Props) {
  const { t, lang } = useLanguage();

  return (
    <main className="min-h-screen bg-white">
      {/* HERO */}
      <div className="bg-gradient-to-br from-teal-50 to-white py-14 px-6 text-center border-b border-gray-100">
        <span className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 text-xs font-bold px-4 py-1.5 rounded-full mb-5 uppercase tracking-wide">
          {t('blog.badge')}
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
          {t('blog.heading')}
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          {t('blog.description')}
        </p>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex gap-10">
          {/* Posts grid */}
          <div className="flex-1 min-w-0">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center text-4xl mb-6">✍️</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t('blog.empty')}</h2>
                <p className="text-gray-400 mb-8 max-w-xs">{t('blog.empty.desc')}</p>
                <Link href="/" className="inline-flex items-center justify-center bg-teal-600 text-white text-sm font-bold px-6 py-3 rounded-full hover:bg-teal-700 transition">
                  {t('global.backToHome')}
                </Link>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-6">{total} article{total !== 1 ? 's' : ''}</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.map((post: any) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="group block bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-video bg-teal-50 overflow-hidden">
                        {post.featuredImage ? (
                          <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl">🐾</div>
                        )}
                      </div>
                      <div className="p-5">
                        {post.category && (
                          <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">{post.category.name}</span>
                        )}
                        <h2 className="text-base font-bold text-gray-900 mt-1 mb-2 line-clamp-2 group-hover:text-teal-600 transition-colors">{post.title}</h2>
                        {post.excerpt && <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{post.excerpt}</p>}
                        <div className="flex items-center justify-between mt-4">
                          {post.publishedAt && (
                            <p className="text-xs text-gray-400">
                              {new Date(post.publishedAt).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                          <span className="text-xs font-semibold text-teal-600 group-hover:underline">{t('blog.readMore')}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {pages > 1 && (
                  <div className="flex justify-center gap-2 mt-12">
                    {page > 1 && (
                      <Link href={`/blog?page=${page - 1}`} className="w-10 h-10 rounded-full flex items-center justify-center text-sm border border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-600 transition">←</Link>
                    )}
                    {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                      <Link key={p} href={`/blog?page=${p}`} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition ${page === p ? 'bg-teal-600 text-white' : 'border border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-600'}`}>
                        {p}
                      </Link>
                    ))}
                    {page < pages && (
                      <Link href={`/blog?page=${page + 1}`} className="w-10 h-10 rounded-full flex items-center justify-center text-sm border border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-600 transition">→</Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20">
              {categories.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-5 mb-6">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                    {t('blog.categories')}
                  </h3>
                  <div className="space-y-1">
                    <Link href="/blog" className="flex items-center justify-between text-sm text-gray-700 hover:text-teal-600 py-1.5 transition-colors font-medium">
                      {t('blog.allPosts')}
                    </Link>
                    {categories.map((cat: any) => (
                      <Link key={cat.id} href={`/blog/category/${cat.slug}`} className="flex items-center justify-between text-sm text-gray-600 hover:text-teal-600 py-1.5 transition-colors">
                        {cat.name}
                        {cat._count?.posts > 0 && <span className="text-xs text-gray-400">{cat._count.posts}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-teal-600 rounded-2xl p-5 text-white text-center">
                <div className="text-3xl mb-3">🐾</div>
                <p className="font-bold text-sm mb-2">{t('blog.cta.heading')}</p>
                <p className="text-teal-100 text-xs mb-4 leading-relaxed">{t('blog.cta.desc')}</p>
                <Link href="/subscribe" className="block bg-white text-teal-600 text-xs font-bold py-2.5 rounded-xl hover:bg-teal-50 transition">
                  {t('blog.cta.btn')}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-gray-50 border-t border-gray-100 py-10 px-6 text-center">
        <p className="text-sm text-gray-400">© {new Date().getFullYear()} Pupbox. Made with 🐾 in Georgia.</p>
        <div className="flex justify-center gap-6 mt-3 text-xs text-gray-400">
          <Link href="/pages/privacy" className="hover:text-teal-600 transition-colors">{t('footer.privacy')}</Link>
          <Link href="/pages/terms" className="hover:text-teal-600 transition-colors">{t('footer.terms')}</Link>
          <Link href="/subscribe" className="hover:text-teal-600 transition-colors">{t('nav.subscribe')}</Link>
        </div>
      </footer>
    </main>
  );
}
