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
 * Cost and margin of a saved plan, as the plan list and view modal show it —
 * the same sum as the builder: every box's products, plus our running and
 * courier cost per box, plus any gift boxes. Older plans kept one flat
 * `planItems` list instead of `boxes`.
 */
export function summarisePlanCost(plan: any) {
  const cfg = plan.translations?.config;
  const boxes: any[] = cfg?.boxes?.length ? cfg.boxes : cfg?.planItems?.length ? [{ items: cfg.planItems }] : [];
  const lines = boxes.flatMap((b) => b.items || []);
  const sum = (items: any[]) => items.reduce((s: number, i: any) => s + num(i.price) * num(i.qty, 1), 0);
  const itemCount = lines.length;
  const n = Number(plan.boxCount) || 1;
  const productCost = sum(lines) + (cfg?.giftBoxes || []).reduce((s: number, g: any) => s + sum(g.items || []), 0);
  const opCost = num(cfg?.operationalCost) * n;
  const delCost = num(cfg?.deliveryCost) * n;
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
