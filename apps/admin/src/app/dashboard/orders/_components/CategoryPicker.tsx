'use client';
import Dropdown from '@/components/Dropdown';

export type Cat = { id: string; name: string; slug: string; parentId?: string | null; children?: Cat[] };

/** Main categories with their subcategories, from the flat admin list. */
export function categoryTree(all: any[]): Cat[] {
  const live = all.filter((c) => !c.deletedAt);
  return live.filter((c) => !c.parentId).map((c) => ({ ...c, children: live.filter((k) => k.parentId === c.id) }));
}

/**
 * One category, main or sub: main categories with their subcategories
 * indented under them. A main one means "all of it, subcategories included".
 */
export default function CategoryPicker({ categories, value, onChange }: { categories: Cat[]; value: string; onChange: (id: string) => void }) {
  const options = [
    { value: '', label: 'All categories' },
    ...categories.flatMap((c) => [{ value: c.id, label: c.name }, ...(c.children ?? []).map((k) => ({ value: k.id, label: k.name, indent: true }))]),
  ];
  return <Dropdown aria-label="Category" icon="🏷️" value={value} onChange={onChange} options={options} placeholder="All categories" />;
}
