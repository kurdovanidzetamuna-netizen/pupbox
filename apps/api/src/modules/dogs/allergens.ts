import type { PrismaService } from '../prisma/prisma.service';

/**
 * The ready-made allergies customers tick for their dog and admin ticks on a
 * product (admin → Allergies). The English name is the key saved on dogs and
 * products, so it never changes once added; the Georgian name can. Retired
 * ones stay readable on the dogs and products that have them.
 */
export type Allergen = { key: string; ka: string };
export const ALLERGENS_SLUG = 'config-allergens';
export const DEFAULT_ALLERGENS: Allergen[] = [
  { key: 'Chicken', ka: 'ქათამი' }, { key: 'Beef', ka: 'ძროხის ხორცი' }, { key: 'Lamb', ka: 'ცხვრის ხორცი' }, { key: 'Fish', ka: 'თევზი' },
  { key: 'Wheat', ka: 'ხორბალი' }, { key: 'Dairy', ka: 'რძის პროდუქტები' }, { key: 'Soy', ka: 'სოია' }, { key: 'Eggs', ka: 'კვერცხი' },
];

const clean = (list: unknown): Allergen[] => {
  const seen = new Set<string>();
  return (Array.isArray(list) ? list : [])
    .map((a: any) => ({ key: String(a?.key ?? '').trim().slice(0, 40), ka: String(a?.ka ?? '').trim().slice(0, 40) }))
    .map((a) => ({ ...a, key: a.key ? a.key[0].toUpperCase() + a.key.slice(1) : '' }))
    .filter((a) => a.key && !seen.has(a.key.toLowerCase()) && seen.add(a.key.toLowerCase()));
};

export async function allergenList(prisma: PrismaService): Promise<Allergen[]> {
  const row = await prisma.cMSPage.findUnique({ where: { slug: ALLERGENS_SLUG }, select: { content: true } });
  const saved = (row?.content as any)?.allergens;
  return Array.isArray(saved) ? clean(saved) : DEFAULT_ALLERGENS;
}

export async function saveAllergens(prisma: PrismaService, list: Allergen[]) {
  const allergens = clean(list);
  await prisma.cMSPage.upsert({
    where: { slug: ALLERGENS_SLUG },
    create: { key: ALLERGENS_SLUG, slug: ALLERGENS_SLUG, title: 'Allergies', status: 'PUBLISHED', content: { allergens } },
    update: { content: { allergens }, status: 'PUBLISHED' },
  });
  return allergenList(prisma);
}
