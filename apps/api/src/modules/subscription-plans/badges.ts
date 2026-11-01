import type { PrismaService } from '../prisma/prisma.service';

/** The labels a plan card can carry ("Most Popular", "Limited"…), named in both languages. */
export type Badge = { en: string; ka: string };
export const BADGES_SLUG = 'config-badges';

/** Every shop starts with these; they can be renamed but not removed. */
export const BUILT_IN_BADGES: Badge[] = [
  { en: 'Most Popular', ka: 'ყველაზე პოპულარული' },
  { en: 'Best Value', ka: 'საუკეთესო ფასი' },
  { en: 'New', ka: 'ახალი' },
  { en: 'Limited', ka: 'შეზღუდული' },
];

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The badge list admin keeps (admin → Plans → Badges); the built-in ones are always there. */
export async function badgeList(prisma: PrismaService): Promise<Badge[]> {
  const row = await prisma.cMSPage.findUnique({ where: { slug: BADGES_SLUG }, select: { content: true } });
  const saved = (((row?.content ?? {}) as any).badges ?? []) as Badge[];
  const clean = saved.filter((b) => b && typeof b.en === 'string' && b.en.trim()).map((b) => ({ en: b.en.trim().slice(0, 30), ka: String(b.ka ?? '').trim().slice(0, 30) }));
  const builtIn = BUILT_IN_BADGES.map((d) => clean.find((b) => same(b.en, d.en)) ?? d);
  return [...builtIn, ...clean.filter((b) => !BUILT_IN_BADGES.some((d) => same(d.en, b.en)))];
}

/** Saves the list (deduplicated; the built-in ones are kept even if left out). */
export async function saveBadges(prisma: PrismaService, input: Badge[]) {
  const seen = new Set<string>();
  const badges = input
    .map((b) => ({ en: String(b?.en ?? '').trim().slice(0, 30), ka: String(b?.ka ?? '').trim().slice(0, 30) }))
    .filter((b) => b.en && !seen.has(b.en.toLowerCase()) && seen.add(b.en.toLowerCase()));
  for (const d of BUILT_IN_BADGES) if (!badges.some((b) => same(b.en, d.en))) badges.unshift(d);
  await prisma.cMSPage.upsert({
    where: { slug: BADGES_SLUG },
    create: { key: BADGES_SLUG, slug: BADGES_SLUG, title: 'Plan badges', status: 'PUBLISHED', content: { badges } },
    update: { content: { badges }, status: 'PUBLISHED' },
  });
  return badgeList(prisma);
}
