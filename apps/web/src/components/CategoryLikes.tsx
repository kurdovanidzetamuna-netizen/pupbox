'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export type ShopCategory = { id: string; name: string; slug: string; parentId: string | null; sortOrder?: number; translations?: any };

// One request per visit: the same list is used by every dog form on the page.
let cache: Promise<ShopCategory[]> | null = null;
export function loadCategories(): Promise<ShopCategory[]> {
  cache ??= fetch(`${API}/categories`)
    .then((r) => (r.ok ? r.json() : []))
    .then((d) => (Array.isArray(d) ? d : d.items ?? []).filter((c: any) => c.isActive !== false && !c.deletedAt))
    .catch(() => { cache = null; return []; });
  return cache;
}
export function useCategories() {
  const [cats, setCats] = useState<ShopCategory[]>([]);
  useEffect(() => { let on = true; loadCategories().then((c) => on && setCats(c)); return () => { on = false; }; }, []);
  return cats;
}

export const catName = (c: ShopCategory, lang: string) => (lang === 'ka' && c.translations?.ka?.name) || c.name;
const EMOJI: Record<string, string> = { treats: '🦴', toys: '🧸', accessories: '🎀', grooming: '🛁', food: '🥣', health: '💊' };
export const catEmoji = (c: ShopCategory) => EMOJI[c.slug] ?? '🐾';
const sorted = (l: ShopCategory[]) => [...l].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

/**
 * What the dog loves, as the shop's own categories: tap a main one (Toys),
 * then — if you like — the kinds within it (Chew toys, Plush). A main one on
 * its own means "anything in it". Boxes are picked from these, so they match
 * what we actually stock. Kinds that clash with an allergy (Chicken when the
 * dog can't have chicken) aren't offered.
 *
 * Stored as a list of category ids: main ones and/or their kinds.
 */
export default function CategoryLikes({ value, onChange, allergies = [] }: { value: string[]; onChange: (v: string[]) => void; allergies?: string[] }) {
  const { lang, t } = useLanguage();
  const cats = useCategories();
  const mains = sorted(cats.filter((c) => !c.parentId));
  const kids = (id: string) => sorted(cats.filter((c) => c.parentId === id));
  const blocked = allergies.map((a) => a.toLowerCase());
  const clash = (c: ShopCategory) => blocked.some((a) => c.slug.includes(a) || c.name.toLowerCase().includes(a));
  const on = new Set(value);
  // An allergy added later takes a clashing kind (Chicken) off the list.
  const clashing = cats.filter((c) => c.parentId && on.has(c.id) && clash(c)).map((c) => c.id).join();
  useEffect(() => {
    if (clashing) onChange(value.filter((id) => !clashing.split(',').includes(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clashing]);

  const toggleMain = (m: ShopCategory) => {
    if (on.has(m.id)) onChange(value.filter((id) => id !== m.id && !kids(m.id).some((k) => k.id === id)));
    else onChange([...value, m.id]);
  };
  const toggleKind = (m: ShopCategory, k: ShopCategory) => {
    const next = on.has(k.id) ? value.filter((id) => id !== k.id) : [...value, k.id];
    onChange(next.includes(m.id) ? next : [...next, m.id]);
  };

  if (!mains.length) return <p className="text-[12.5px] text-gray-400">{t('dog.likesLoading')}</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('dog.likes')}>
        {mains.map((m) => {
          const active = on.has(m.id);
          return (
            <button key={m.id} type="button" onClick={() => toggleMain(m)} aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-3.5 py-2 text-[13px] font-bold transition-colors ${active ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-teal-50 hover:text-teal-800'}`}>
              <span className="text-[16px] leading-none" aria-hidden="true">{catEmoji(m)}</span>{catName(m, lang)}
            </button>
          );
        })}
      </div>
      {mains.filter((m) => on.has(m.id) && kids(m.id).length > 0).map((m) => {
        const list = kids(m.id).filter((k) => !clash(k));
        const chosen = list.filter((k) => on.has(k.id)).length;
        return (
          <div key={m.id} className="rounded-2xl bg-teal-50/60 px-3 py-2.5">
            <p className="text-[11.5px] font-semibold text-teal-800 mb-2">
              {catEmoji(m)} {catName(m, lang)} · <span className="font-normal text-teal-700/80">{chosen ? t('dog.likesSome') : t('dog.likesAll')}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {list.map((k) => {
                const active = on.has(k.id);
                return (
                  <button key={k.id} type="button" onClick={() => toggleKind(m, k)} aria-pressed={active}
                    className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${active ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-teal-300'}`}>
                    {active ? '✓ ' : ''}{catName(k, lang)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** "Toys: Chew toys, Plush · Treats" — for showing a dog's likes. */
export function likesText(ids: string[] | undefined, cats: ShopCategory[]) {
  if (!ids?.length || !cats.length) return [] as { main: ShopCategory; kinds: ShopCategory[] }[];
  const set = new Set(ids);
  return sorted(cats.filter((c) => !c.parentId && (set.has(c.id) || cats.some((k) => k.parentId === c.id && set.has(k.id)))))
    .map((main) => ({ main, kinds: sorted(cats.filter((k) => k.parentId === main.id && set.has(k.id))) }));
}
