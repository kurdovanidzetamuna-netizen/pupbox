import Link from 'next/link';
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
  if (!cat) return { title: 'Category not found' };
  return {
    title: `${cat.name} — Dog Care Tips | Pupbox Blog`,
    description: cat.description || `Browse all ${cat.name} articles on the Pupbox blog.`,
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

      <div className="max-w-6xl mx-auto px-6 py-12">
        <nav className="text-sm text-gray-400 mb-8 flex gap-2">
          <Link href="/blog" className="hover:text-teal-600">Blog</Link>
          <span>/</span>
          <span className="text-gray-700">{cat.name}</span>
        </nav>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{cat.name}</h1>
        {cat.description && <p className="text-gray-500 mb-10">{cat.description}</p>}

        {posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No posts in this category yet.</div>
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
