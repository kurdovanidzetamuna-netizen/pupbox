import Link from 'next/link';
import T from '@/components/T';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { API_URL } from '@/lib/api';

async function getCategory(slug: string) {
  const res = await fetch(`${API_URL}/blog/categories`, { next: { revalidate: 600 } });
  if (!res.ok) return null;
  const cats = await res.json();
  return cats.find((c: any) => c.slug === slug) || null;
}

async function getPosts(categorySlug: string, page = 1) {
  const res = await fetch(`${API_URL}/blog/posts?category=${categorySlug}&page=${page}&limit=9`, { next: { revalidate: 300 } });
  if (!res.ok) return { posts: [], pages: 0 };
  return res.json();
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cat = await getCategory(params.slug);
  if (!cat) return { title: 'გვერდი ვერ მოიძებნა' };
  return {
    title: `${cat.translations?.ka?.name || cat.name} — ძაღლის მოვლის რჩევები | Pupbox ბლოგი`,
    description: cat.description || `${cat.translations?.ka?.name || cat.name} — ყველა სტატია Pupbox-ის ბლოგზე.`,
  };
}

export default async function BlogCategoryPage({ params, searchParams }: { params: { slug: string }; searchParams: { page?: string } }) {
  const [cat, { posts, pages }] = await Promise.all([
    getCategory(params.slug),
    getPosts(params.slug, Number(searchParams.page) || 1),
  ]);
  if (!cat) notFound();
  const page = Number(searchParams.page) || 1;

  return (
    <main className="min-h-screen bg-gray-50">

      <div className="max-w-7xl mx-auto px-6 py-12">
        <nav className="text-sm text-gray-400 mb-8 flex gap-2">
          <Link href="/blog" className="hover:text-teal-600"><T k="crumb.blog" /></Link>
          <span>/</span>
          <span className="text-gray-700">{cat.name}</span>
        </nav>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{cat.name}</h1>
        {cat.description && <p className="text-gray-500 mb-10">{cat.description}</p>}

        {posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400"><T k="blog.catEmpty" /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: any) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group block bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition">
                <div className="aspect-video bg-gray-50 overflow-hidden">
                  {post.featuredImage ? (
                    <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">🐾</div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-teal-600 transition">{post.title}</h2>
                  {post.excerpt && <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>}
                  {post.publishedAt && (
                    <p className="text-xs text-gray-400 mt-3">{new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <Link key={p} href={`/blog/category/${params.slug}?page=${p}`} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition ${page === p ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-400'}`}>{p}</Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
