import { API } from './constants';

/** Admin API calls used by the subscription-plans page. Each returns what the
 *  caller already branched on (a Response where `ok` matters, data otherwise). */

const token = () => localStorage.getItem('admin_token');
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });
const jsonHeaders = () => ({ ...authHeaders(), 'Content-Type': 'application/json' });

/** Box types (Mini, Standard, Premium) for the plan's "Box type" choice. */
export async function fetchTiers(): Promise<any[]> {
  const r = await fetch(`${API}/admin/box-tiers`, { headers: authHeaders() });
  return r.ok ? r.json() : [];
}

export function fetchPlans() {
  return fetch(`${API}/admin/subscription-plans`, { headers: authHeaders() });
}

/** Number of orders on a plan, or undefined when the request is refused. */
export async function fetchPlanOrderCount(planId: string): Promise<number | undefined> {
  const r = await fetch(`${API}/orders/admin?planId=${planId}&limit=1`, { headers: authHeaders() });
  if (!r.ok) return undefined;
  const d = await r.json();
  return d.total || 0;
}

/** Creates the plan when it has no id yet, otherwise updates it. */
export function savePlan(planId: string | undefined, body: any) {
  return fetch(
    planId ? `${API}/admin/subscription-plans/${planId}` : `${API}/admin/subscription-plans`,
    {
      method: planId ? 'PUT' : 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    }
  );
}

export function togglePlanActive(p: any) {
  return fetch(`${API}/admin/subscription-plans/${p.id}`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify({ ...p, isActive: !p.isActive }) });
}

export function deletePlan(planId: string) {
  return fetch(`${API}/admin/subscription-plans/${planId}`, { method: 'DELETE', headers: authHeaders() });
}

/** A badge marks one plan at a time: strips `badge` from every other plan. */
export async function clearBadgeFromOtherPlans(badge: string, keepPlanId: string) {
  const allRes = await fetchPlans();
  if (!allRes.ok) return;
  const allPlans = await allRes.json();
  await Promise.all(allPlans
    .filter((p: any) => p.id !== keepPlanId && p.badge === badge)
    .map((p: any) => fetch(`${API}/admin/subscription-plans/${p.id}`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({
        name: p.name, slug: p.slug, durationValue: p.durationValue, durationUnit: p.durationUnit,
        boxCount: p.boxCount, price: p.price, benefits: p.benefits ?? [],
        sortOrder: p.sortOrder ?? 0, isActive: p.isActive,
        deliveryIncluded: p.deliveryIncluded, autoRenewal: p.autoRenewal, giftable: p.giftable ?? true,
        translations: p.translations ?? {},
        ...(p.discountPercent != null ? { discountPercent: p.discountPercent } : {}),
        ...(p.monthlyEquivPrice != null ? { monthlyEquivPrice: p.monthlyEquivPrice } : {}),
        ...(p.description ? { description: p.description } : {}),
      }),
    }))
  );
}

/** Box-included products available to put in a plan's boxes. */
export function fetchBoxItems(): Promise<any[]> {
  return fetch(`${API}/admin/products?includedInBox=true&limit=200`, { headers: authHeaders() })
    .then(r => r.ok ? r.json() : { items: [] })
    .then(prod => prod.items || []);
}

export function fetchActiveCoupons(): Promise<any[]> {
  return fetch(`${API}/admin/coupons`, { headers: authHeaders() })
    .then(r => r.ok ? r.json() : [])
    .then(coup => Array.isArray(coup) ? coup.filter((c: any) => c.isActive) : []);
}
