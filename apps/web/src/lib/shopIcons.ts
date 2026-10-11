/** A friendly icon and soft colour for a category (its own image wins when admin added one). */
const CATEGORY_LOOK: [RegExp, string, string][] = [
  [/treat|ნუგბ/i, '🦴', 'from-teal-50 to-teal-100/70'],
  [/toy|სათამაშ/i, '🧸', 'from-peach-50 to-peach-100/70'],
  [/groom|მოვლ/i, '🧴', 'from-sky-50 to-sky-100/70'],
  [/access|აქსესუ/i, '🎀', 'from-lilac-50 to-lilac-100/70'],
  [/food|საკვ/i, '🥣', 'from-amber-50 to-amber-100/70'],
  [/bed|საწოლ/i, '🛏️', 'from-lilac-50 to-sky-50'],
  [/walk|leash|სასეირნ/i, '🦮', 'from-teal-50 to-sky-50'],
];

export function categoryLook(c: { slug?: string; name?: string } | null | undefined) {
  const hit = c ? CATEGORY_LOOK.find(([re]) => re.test(`${c.slug ?? ''} ${c.name ?? ''}`)) : undefined;
  return { icon: hit?.[1] ?? '🐾', tint: hit?.[2] ?? 'from-gray-50 to-teal-50/60' };
}
