'use client';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';

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

  const lines: any[] = (cart?.items ?? []).filter((i: any) => i.productId === productId);
  const inCart = lines.reduce((n, i) => n + Number(i.quantity || 0), 0);
  const line = lines.length === 1 ? lines[0] : null;

  async function run(fn: () => Promise<void>) {
    if (busy) return false;
    setBusy(true); setError('');
    try { await fn(); return true; }
    catch (e: any) { setError(e?.message || 'error'); setTimeout(() => setError(''), 3000); return false; }
    finally { setBusy(false); }
  }

  return {
    inCart, line, busy, error,
    /** Add n (with a size or name when the product needs one). */
    add: (n = 1, personalisation?: { engraving?: string; size?: string }) =>
      run(() => (line && !personalisation ? updateItem(line.id, line.quantity + n) : addProduct(productId, n, personalisation))),
    more: () => run(() => (line ? updateItem(line.id, line.quantity + 1) : addProduct(productId, 1))),
    less: () => run(async () => { if (line) await (line.quantity <= 1 ? removeItem(line.id) : updateItem(line.id, line.quantity - 1)); }),
    /** Take the product out altogether. */
    remove: () => run(async () => { for (const l of lines) await removeItem(l.id); }),
  };
}
