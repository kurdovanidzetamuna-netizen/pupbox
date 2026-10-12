'use client';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useBasketLine } from '@/lib/useBasketLine';

/** How many can still be bought (stock minus what's held in open orders). */
export const available = (inv: any) => (inv ? Math.max(0, Number(inv.quantity) - Number(inv.reservedQty || 0)) : 0);

/**
 * Choosing a product for the basket — size, name to engrave, how many — the
 * same on a shop card, in the quick-choose pop-up and on the product page.
 * Each size / name is its own basket line. After adding, the form clears so
 * the next pick starts fresh (a new name, another size); more of one already
 * picked comes from its + in the picks list.
 */
export function useChoice(product: any) {
  const { t } = useLanguage();
  const basket = useBasketLine(product.id);
  const sizes: string[] = product.personalisation?.sizes ?? [];
  const engr = product.personalisation?.engraving as { maxLength: number } | undefined;
  const needsChoice = sizes.length > 0 || !!engr;
  const [size, setSizeRaw] = useState('');
  const [engraving, setEngravingRaw] = useState('');
  const [qty, setQty] = useState(1);
  const [errs, setErrs] = useState<{ size?: string; engraving?: string }>({});

  const left = available(product.inventory);
  const room = Math.max(0, left - basket.totalInCart);
  const choice = needsChoice ? { ...(engr ? { engraving: engraving.trim() } : {}), ...(sizes.length ? { size } : {}) } : null;
  // Started a new pick? (a name typed; or for size-only products, a size chosen)
  const started = needsChoice ? (engr ? !!engraving.trim() : !!size) : qty > 1;
  /** Show the button as "already chosen ✓ n" until a new pick is started. */
  const picked = basket.inCart > 0 && !started;

  /** How many of each size were picked this visit. */
  const sizeCounts: Record<string, number> = {};
  for (const l of basket.lines) if (l.personalisation?.size) sizeCounts[l.personalisation.size] = (sizeCounts[l.personalisation.size] ?? 0) + l.quantity;

  const setSize = (v: string) => { setSizeRaw(v); setErrs((x) => ({ ...x, size: undefined })); };
  const setEngraving = (v: string) => { setEngravingRaw(v); setErrs((x) => ({ ...x, engraving: undefined })); };

  async function add() {
    const e: typeof errs = {};
    if (sizes.length && !size) e.size = t('pdp.p.needSize');
    if (engr && !engraving.trim()) e.engraving = t('pdp.p.needName');
    setErrs(e);
    if (e.size || e.engraving) return false;
    const ok = await basket.add(qty, choice);
    if (ok) {
      setQty(1);
      setEngravingRaw('');
      // A name product keeps its size (the next name is often the same size).
      if (!engr) setSizeRaw('');
    }
    return ok;
  }

  /** Put a picked line's size and name back in the form. */
  function load(l: any) {
    if (l.personalisation?.size) setSizeRaw(l.personalisation.size);
    if (engr) setEngravingRaw(l.personalisation?.engraving ?? '');
    setQty(1); setErrs({});
  }

  function reset() { setSizeRaw(''); setEngravingRaw(''); setQty(1); setErrs({}); }

  return { basket, sizes, engr, needsChoice, size, setSize, engraving, setEngraving, qty, setQty, errs, left, room, picked, sizeCounts, add, load, reset };
}
export type Choice = ReturnType<typeof useChoice>;
