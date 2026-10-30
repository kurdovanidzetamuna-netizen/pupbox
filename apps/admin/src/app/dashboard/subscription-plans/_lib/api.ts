import { api, del, getOr, put, post } from '@/lib/api';

/** Admin API calls used by the subscription-plans page. */

/** Box types (Mini, Standard, Premium) for the plan's "Box type" choice. */
export const fetchTiers = (): Promise<any[]> => getOr('/admin/box-tiers', []);

export const fetchPlans = (): Promise<any[]> => api('/admin/subscription-plans');

/** Number of orders on a plan, or undefined when the request is refused. */
export async function fetchPlanOrderCount(planId: string): Promise<number | undefined> {
  const d = await getOr<any>(`/orders/admin?planId=${planId}&limit=1`, null);
  return d ? d.total || 0 : undefined;
}

/** Creates the plan when it has no id yet, otherwise updates it. Throws an ApiError when refused. */
export const savePlan = (planId: string | undefined, body: any) =>
  planId ? put(`/admin/subscription-plans/${planId}`, body) : post('/admin/subscription-plans', body);

/** Only the field that changes: the API refuses the read-only ones (id, dates, tier). */
export const togglePlanActive = (p: any) => put(`/admin/subscription-plans/${p.id}`, { isActive: !p.isActive }).catch(() => null);

/** Show on the site or hide it; hidden plans keep renewing for the people already on them. */
export const togglePlanListed = (p: any) => put(`/admin/subscription-plans/${p.id}`, { listed: p.listed === false }).catch(() => null);

/** Shows or hides a whole group: the box-type plans, or the plans without a box type. */
export const setGroupListed = (group: 'BOX_TYPES' | 'OTHER', listed: boolean) =>
  post('/admin/subscription-plans/show-on-site', { group, listed }).catch(() => null);

export const deletePlan = (planId: string) => del(`/admin/subscription-plans/${planId}`).catch(() => null);

/** A badge marks one plan at a time: strips `badge` from every other plan. */
export async function clearBadgeFromOtherPlans(badge: string, keepPlanId: string) {
  const allPlans = await getOr<any[] | null>('/admin/subscription-plans', null);
  if (!allPlans) return;
  await Promise.all(allPlans
    .filter((p: any) => p.id !== keepPlanId && p.badge === badge)
    .map((p: any) => put(`/admin/subscription-plans/${p.id}`, {
      name: p.name, slug: p.slug, durationValue: p.durationValue, durationUnit: p.durationUnit,
      boxCount: p.boxCount, price: p.price, benefits: p.benefits ?? [],
      sortOrder: p.sortOrder ?? 0, isActive: p.isActive,
      deliveryIncluded: p.deliveryIncluded, autoRenewal: p.autoRenewal, giftable: p.giftable ?? true,
      translations: p.translations ?? {},
      ...(p.discountPercent != null ? { discountPercent: p.discountPercent } : {}),
      ...(p.monthlyEquivPrice != null ? { monthlyEquivPrice: p.monthlyEquivPrice } : {}),
      ...(p.description ? { description: p.description } : {}),
    }).catch(() => null))
  );
}

/** Box-included products available to put in a plan's boxes. */
export const fetchBoxItems = (): Promise<any[]> =>
  getOr<any>('/admin/products?includedInBox=true&limit=200', { items: [] }).then((prod) => prod.items || []);

export const fetchActiveCoupons = (): Promise<any[]> =>
  getOr<any>('/admin/coupons', []).then((coup) => (Array.isArray(coup) ? coup.filter((c: any) => c.isActive) : []));
