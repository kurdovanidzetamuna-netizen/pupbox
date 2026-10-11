'use client';
import { useState, useSyncExternalStore } from 'react';
import { useCart } from '@/context/CartContext';

type Choice = { engraving?: string; size?: string } | null | undefined;

/** One basket line's identity: the product plus what was chosen for it. */
const keyOf = (productId: string, p: Choice) => `${productId}|${p?.size ?? ''}|${(p?.engraving ?? '').trim()}`;

/**
 * Choices made during this visit. The basket itself is kept (the header
 * count and the basket page still show everything), but the shop's "chosen"
 * marks — the 🛍 tag, the outline, the − n + on a card, the list of picked
 * sizes and names on a product page — are only for what was picked since the
 * page was opened. A refresh starts them clean.
 */
const chosen = new Set<string>();
let version = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
function mark(key: string, on: boolean) {
  if (on === chosen.has(key)) return;
  if (on) chosen.add(key); else chosen.delete(key);
  version++;
  listeners.forEach((l) => l());
}

/**
 * One product's place in the basket, for the shop card and the product
 * page alike: how many are in it, and add / one less / take out.
 * A product with sizes or a name to engrave can be in the basket several
 * times (one line per choice); `lines` lists the ones picked this visit.
 */
export function useBasketLine(productId: string) {
  const { cart, addProduct, updateItem, removeItem } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useSyncExternalStore(subscribe, () => version, () => 0);

  const all: any[] = (cart?.items ?? []).filter((i: any) => i.productId === productId);
  const total = all.reduce((n, i) => n + Number(i.quantity || 0), 0);
  const lines = all.filter((i) => chosen.has(keyOf(productId, i.personalisation)));
  const inCart = lines.reduce((n, i) => n + Number(i.quantity || 0), 0);
  const plain = all.length === 1 && !all[0].personalisation ? all[0] : null;

  async function run(fn: () => Promise<void>, after?: () => void) {
    if (busy) return false;
    setBusy(true); setError('');
    try { await fn(); after?.(); return true; }
    catch (e: any) { setError(e?.message || 'error'); setTimeout(() => setError(''), 3000); return false; }
    finally { setBusy(false); }
  }

  /** The chosen line for exactly this choice, if there is one. */
  const lineFor = (p?: Choice) => lines.find((l) => keyOf(productId, l.personalisation) === keyOf(productId, p)) ?? null;

  return {
    /** How many to show as chosen: only what was picked during this visit. */
    inCart,
    /** The single plain line (for the − n + on a card), when chosen. */
    line: plain && lines.includes(plain) ? plain : null,
    /** Every chosen line of this product (one per size / name). */
    lines,
    lineFor,
    /** Everything of this product in the basket (for stock limits). */
    totalInCart: total,
    busy, error,
    /** Add n (with a size or name when the product needs one). */
    add: (n = 1, p?: Choice) =>
      run(() => (plain && !p ? updateItem(plain.id, plain.quantity + n) : addProduct(productId, n, p ?? undefined)), () => mark(keyOf(productId, p), true)),
    more: () => run(() => (plain ? updateItem(plain.id, plain.quantity + 1) : addProduct(productId, 1)), () => mark(keyOf(productId, null), true)),
    less: () => run(async () => {
      if (!plain) return;
      await (plain.quantity <= 1 ? removeItem(plain.id) : updateItem(plain.id, plain.quantity - 1));
    }, () => { if (plain && plain.quantity <= 1) mark(keyOf(productId, null), false); }),
    /** Change one chosen line: a new amount, or 0 to take it out. */
    setLine: (l: any, q: number) => run(() => (q <= 0 ? removeItem(l.id) : updateItem(l.id, q)),
      () => { if (q <= 0) mark(keyOf(productId, l.personalisation), false); }),
    /** Take what was chosen this visit out altogether. */
    remove: () => run(async () => { for (const l of lines) await removeItem(l.id); },
      () => lines.forEach((l) => mark(keyOf(productId, l.personalisation), false))),
  };
}
