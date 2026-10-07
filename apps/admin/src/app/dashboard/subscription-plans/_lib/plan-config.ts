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

export function num(v: any, fallback = 0) { const n = parseFloat(v); return isNaN(n) ? fallback : n; }

/** Derives a clean URL slug from a plan name. Collapses runs of separators so
 *  "3 - month" cannot become "3---month", which is how one shipped already. */
export function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}
