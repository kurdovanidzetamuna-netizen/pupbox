import { Metadata } from 'next';
import BlogClient from '@/components/BlogClient';
import { blogPage } from '@pupbox/content';
import { getStoredContent, pageMetadata } from '@/lib/content';

export const generateMetadata = () => pageMetadata(blogPage);

async function getPosts(page = 1) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/blog/posts?page=${page}&limit=9`, { next: { revalidate: 300 } });
    if (!res.ok) return { posts: [], total: 0, pages: 0 };
    return res.json();
  } catch {
    return { posts: [], total: 0, pages: 0 };
  }
}

async function getCategories() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/blog/categories`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function BlogPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams.page) || 1;
  const [{ posts, total, pages }, categories, content] = await Promise.all([getPosts(page), getCategories(), getStoredContent(blogPage)]);

  return <BlogClient posts={posts} total={total} pages={pages} page={page} categories={categories} content={content} />;
}
