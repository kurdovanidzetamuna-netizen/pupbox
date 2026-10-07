import { EMPTY_CONFIG, type PlanConfig } from './constants';
import type { BoxConfig, PlanItem } from './types';

export function migrateConfig(saved: any, boxCount: number): PlanConfig {
  const base = { ...EMPTY_CONFIG };
  if (!saved) return { ...base, boxes: Array.from({ length: boxCount }, () => ({ items: [] })) };
  const legacyItems: PlanItem[] = saved.planItems || [];
  const rawBoxes: BoxConfig[] = saved.boxes || [];
  const boxes: BoxConfig[] = Array.from({ length: boxCount }, (_, i) => ({
    items: rawBoxes[i]?.items ?? (i === 0 ? legacyItems : []),
  }));
  return { ...base, ...saved, boxes, giftBoxes: saved.giftBoxes || [] };
}

/**
 * Cost and margin of a saved plan, as the plan list and view modal show it.
 *
 * Note: this reads only the legacy flat `planItems`, not the per-box `boxes`
 * the builder now saves, so it matches what those views have always shown.
 */
export function summarisePlanCost(plan: any) {
  const cfg = plan.translations?.config;
  const itemCount = cfg?.planItems?.length || 0;
  const productCost = cfg?.planItems?.reduce((s: number, i: any) => s + i.price * i.qty, 0) || 0;
  const opCost = cfg?.operationalCost || 0;
  const delCost = cfg?.deliveryFree ? 0 : (cfg?.deliveryCost || 0);
  const margin = Number(plan.price) - productCost - opCost - delCost;
  return { cfg, itemCount, productCost, opCost, delCost, margin, hasConfig: itemCount > 0 };
}

export function num(v: any, fallback = 0) { const n = parseFloat(v); return isNaN(n) ? fallback : n; }

/** Derives a clean URL slug from a plan name. Collapses runs of separators so
 *  "3 - month" cannot become "3---month", which is how one shipped already. */
export function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}
