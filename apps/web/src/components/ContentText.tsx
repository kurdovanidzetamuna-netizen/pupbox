'use client';
import type { PageDef, StoredContent } from '@pupbox/content';
import { usePage } from '@/lib/usePage';

/**
 * One admin-edited text for server components, which can't read the
 * visitor's language: `<ContentText page={shopPage} content={c} at="header.heading" />`.
 */
export default function ContentText({ page, content, at, as: Tag }: { page: PageDef; content: StoredContent | null; at: string; as?: 'p' | 'span' }) {
  const c = usePage(page, content);
  const [section, field] = at.split('.');
  const text = c[section]?.[field] ?? '';
  if (!text) return null;
  return Tag ? <Tag>{text}</Tag> : <>{text}</>;
}
