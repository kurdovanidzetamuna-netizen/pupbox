'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { storedReferral, forgetReferral } from '@/lib/referral';
import { track, itemsOf } from '@/lib/tracking';
import { API_URL } from '@/lib/api';
import { savedToken } from '@/lib/authFetch';
import type { Api } from '@pupbox/content';


function getSessionId() {
  if (typeof window === 'undefined') return 'guest';
  let sid = localStorage.getItem('pupbox_session');
  if (!sid) { sid = Math.random().toString(36).slice(2); localStorage.setItem('pupbox_session', sid); }
  return sid;
}

/**
 * The guest session id is sent even when signed in: the API uses it to fold
 * the cart built before signing in into the account cart, once.
 */
export function cartHeaders(): Record<string, string> {
  const token = savedToken();
  return { 'Content-Type': 'application/json', 'x-session-id': getSessionId(), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
const getHeaders = cartHeaders;

interface CartContextType {
  cart: Api.Cart | null;
  /** False until the first fetch finishes, so empty and not-loaded differ. */
  ready: boolean;
  loading: boolean;
  addProduct: (productId: string, quantity?: number, personalisation?: { engraving?: string; size?: string }) => Promise<void>;
  addPlan: (planId: string) => Promise<void>;
  /** Puts a box the customer built in the basket, or replaces the one being edited. */
  addBox: (items: { productId: string; quantity: number }[], monthly: boolean, mystery?: number, replaceItemId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

/** Ads and analytics: what was just put in the basket (lib/tracking; nothing is sent without consent). */
function added(cart: Api.Cart | null, match: (line: Api.CartItem) => boolean, quantity = 1) {
  const line = (cart?.items ?? []).filter(match).pop();
  if (line) track('AddToCart', { value: Number(line.price) * quantity, items: itemsOf([{ ...line, quantity }]) });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Api.Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/cart`, { headers: getHeaders() });
      if (res.ok) setCart(await res.json());
    } catch {}
    finally { setReady(true); }
  }, []);

  useEffect(() => { refresh(); }, []);

  // A friend's code from their link (?ref=NINO-4K7P) goes on the basket by
  // itself, once there's something in it and no other code. If it can't apply
  // to this customer (their own code, not a first order), it's forgotten.
  const tried = useRef('');
  useEffect(() => {
    const code = storedReferral();
    if (!code || !cart?.items?.length || cart.coupon || cart.referral) return;
    const key = `${code}:${cart.userId ?? 'guest'}`;
    if (tried.current === key) return;
    tried.current = key;
    fetch(`${API_URL}/cart/coupon`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ code }) })
      .then(async (r) => {
        if (r.ok) setCart(await r.json());
        else if (cart.userId) forgetReferral();
      })
      .catch(() => {});
  }, [cart]);
  // After sign-out, show the guest cart rather than the account's.
  useEffect(() => {
    const onOut = () => { refresh(); };
    window.addEventListener('pupbox:signed-out', onOut);
    return () => window.removeEventListener('pupbox:signed-out', onOut);
  }, [refresh]);

  async function call(path: string, method = 'POST', body?: any): Promise<any> {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cart${path}`, { method, headers: getHeaders(), body: body ? JSON.stringify(body) : undefined });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const next = await res.json();
      setCart(next);
      return next;
    } finally { setLoading(false); }
  }

  return (
    <CartContext.Provider value={{
      cart, ready, loading, refresh,
      addProduct: (productId, quantity = 1, personalisation) => call('/items', 'POST', { productId, quantity, ...(personalisation ? { personalisation } : {}) }).then((n) => added(n, (i) => i.productId === productId, quantity)),
      addPlan: (planId) => call('/items', 'POST', { subscriptionPlanId: planId }).then((n) => added(n, (i) => i.subscriptionPlanId === planId)),
      addBox: (items, monthly, mystery = 0, replaceItemId) => call('/custom-box', 'POST', { items, monthly, mystery, ...(replaceItemId ? { replaceItemId } : {}) }).then((n) => (replaceItemId ? undefined : added(n, (i) => !!i.customBoxId))),
      updateItem: (itemId, quantity) => call(`/items/${itemId}`, 'PUT', { quantity }),
      removeItem: (itemId) => call(`/items/${itemId}`, 'DELETE'),
      applyCoupon: (code) => call('/coupon', 'POST', { code }),
      // Taking a friend's code off means it: it won't come back by itself.
      removeCoupon: () => { if (cart?.referral) forgetReferral(); return call('/coupon', 'DELETE'); },
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
}
