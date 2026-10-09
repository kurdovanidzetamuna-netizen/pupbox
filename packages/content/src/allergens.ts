/**
 * Ingredients dogs commonly react to. Dogs' allergies and products'
 * allergens both use these keys (plus anything typed by hand), so a box can
 * be checked against its dog. Matching ignores letter case.
 */
export const ALLERGENS = [
  { key: 'Chicken', ka: 'ქათამი' },
  { key: 'Beef', ka: 'ძროხის ხორცი' },
  { key: 'Lamb', ka: 'ცხვრის ხორცი' },
  { key: 'Fish', ka: 'თევზი' },
  { key: 'Wheat', ka: 'ხორბალი' },
  { key: 'Dairy', ka: 'რძის პროდუქტები' },
  { key: 'Soy', ka: 'სოია' },
  { key: 'Eggs', ka: 'კვერცხი' },
] as const;

const norm = (s: string) => s.trim().toLowerCase();

/** Which of a product's allergens the dog reacts to (by the product's spelling). */
export function allergenClash(dogAllergies: string[] | null | undefined, productAllergens: string[] | null | undefined): string[] {
  const dog = new Set((dogAllergies ?? []).map(norm).filter(Boolean));
  return (productAllergens ?? []).filter((a) => dog.has(norm(a)));
}
