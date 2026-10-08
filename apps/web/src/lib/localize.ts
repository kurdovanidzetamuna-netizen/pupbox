/**
 * Admin stores Georgian copy for a plan under translations.ka (name,
 * description, benefits). Use it when the site is in Georgian and it has been
 * filled in; otherwise fall back to the English original, never to a blank.
 */
export function planText(plan: any, field: 'name' | 'description', lang: string): string {
  const ka = lang === 'ka' ? plan?.translations?.ka?.[field] : '';
  return (typeof ka === 'string' && ka.trim()) || plan?.[field] || '';
}

export function planBenefits(plan: any, lang: string): string[] | null {
  const ka = lang === 'ka' ? plan?.translations?.ka?.benefits : null;
  return Array.isArray(ka) && ka.some((b: string) => b?.trim()) ? ka.filter((b: string) => b?.trim()) : null;
}

/** A product's or category's field in Georgian when admin has filled it in, else the English original. */
export function catalogText(row: any, field: 'name' | 'shortDescription' | 'description', lang: string): string {
  const ka = lang === 'ka' ? row?.translations?.ka?.[field] : '';
  return (typeof ka === 'string' && ka.trim()) || row?.[field] || '';
}

/** Display name for a cart line: the product's or the plan's localized name. */
export function itemName(item: any, lang: string): string {
  return item?.product ? catalogText(item.product, 'name', lang) : planText(item?.subscriptionPlan, 'name', lang);
}
