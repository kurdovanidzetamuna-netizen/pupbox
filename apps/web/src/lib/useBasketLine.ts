'use client';
import { useState, useSyncExternalStore } from 'react';
import { useCart } from '@/context/CartContext';

/**
 * Products chosen during this visit. The basket itself is kept (the header
 * count and the basket page still show everything), but the shop's "chosen"
 * marks — the 🛍 tag, the outline, the − n + on a card — are only for what
 * was picked since the page was opened. A refresh starts them clean.
 */
const chosen = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
function mark(id: string, on: boolean) {
  if (on === chosen.has(id)) return;
  if (on) chosen.add(id); else chosen.delete(id);
  notify();
}

/**
 * One product's place in the basket, for the shop card and the product
 * page alike: how many are in it, and add / one less / take out.
 * A named bowl can be in the basket several times (one line per name), so
 * the steppers only work when there's a single line.
 */
export function useBasketLine(productId: string) {
  const { cart, addProduct, updateItem, removeItem } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isChosen = useSyncExternalStore(subscribe, () => chosen.has(productId), () => false);

  const lines: any[] = (cart?.items ?? []).filter((i: any) => i.productId === productId);
  const total = lines.reduce((n, i) => n + Number(i.quantity || 0), 0);
  const realLine = lines.length === 1 ? lines[0] : null;

  async function run(fn: () => Promise<void>, after?: () => void) {
    if (busy) return false;
    setBusy(true); setError('');
    try { await fn(); after?.(); return true; }
    catch (e: any) { setError(e?.message || 'error'); setTimeout(() => setError(''), 3000); return false; }
    finally { setBusy(false); }
  }

  return {
    /** How many to show as chosen: only what was picked during this visit. */
    inCart: isChosen ? total : 0,
    line: isChosen ? realLine : null,
    /** Everything of this product in the basket (for stock limits). */
    totalInCart: total,
    busy, error,
    /** Add n (with a size or name when the product needs one). */
    add: (n = 1, personalisation?: { engraving?: string; size?: string }) =>
      run(() => (realLine && !personalisation ? updateItem(realLine.id, realLine.quantity + n) : addProduct(productId, n, personalisation)), () => mark(productId, true)),
    more: () => run(() => (realLine ? updateItem(realLine.id, realLine.quantity + 1) : addProduct(productId, 1)), () => mark(productId, true)),
    less: () => run(async () => {
      if (!realLine) return;
      await (realLine.quantity <= 1 ? removeItem(realLine.id) : updateItem(realLine.id, realLine.quantity - 1));
    }, () => { if (realLine && realLine.quantity <= 1) mark(productId, false); }),
    /** Take the product out altogether. */
    remove: () => run(async () => { for (const l of lines) await removeItem(l.id); }, () => mark(productId, false)),
  };
}
