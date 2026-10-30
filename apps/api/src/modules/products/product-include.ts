/** A product's main photo (else the first). */
export const MAIN_IMAGE = { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }], take: 1 };

/**
 * A product as an order or basket line shows it: its main photo, and its
 * category (for a picture when there's none).
 */
export const LINE_PRODUCT = { include: { images: MAIN_IMAGE, category: { select: { slug: true, name: true } } } };
