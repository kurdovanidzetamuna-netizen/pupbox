/**
 * Lari amount as customers should read it: whole amounts without decimals
 * (₾255), anything else exact (₾134.99). Rounding 134.99 up to "₾135" made the
 * pricing page disagree with the cart and checkout.
 */
export function gel(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `₾${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2)}`;
}
