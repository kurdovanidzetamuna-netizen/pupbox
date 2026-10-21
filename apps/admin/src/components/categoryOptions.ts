/**
 * Categories for a dropdown, as a tree: each main category followed by its
 * subcategories, written "Toys › Chew toys" so it's clear where a product goes.
 */
export function categoryOptions(all: any[]): { id: string; label: string }[] {
  const live = all.filter((c) => !c.deletedAt);
  const mains = live.filter((c) => !c.parentId || !live.some((m) => m.id === c.parentId));
  return mains.flatMap((m) => [
    { id: m.id, label: m.name },
    ...live.filter((c) => c.parentId === m.id).map((c) => ({ id: c.id, label: `${m.name} › ${c.name}` })),
  ]);
}
