'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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
  const token = typeof window !== 'undefined' ? localStorage.getItem('pupbox_token') : null;
  return { 'Content-Type': 'application/json', 'x-session-id': getSessionId(), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
const getHeaders = cartHeaders;

interface CartContextType {
  cart: any;
  /** False until the first fetch finishes, so empty and not-loaded differ. */
  ready: boolean;
  loading: boolean;
  addProduct: (productId: string, quantity?: number, personalisation?: { engraving?: string; size?: string }) => Promise<void>;
  addPlan: (planId: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<any>(null);
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

  async function call(path: string, method = 'POST', body?: any) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cart${path}`, { method, headers: getHeaders(), body: body ? JSON.stringify(body) : undefined });
      if (res.ok) setCart(await res.json());
      else { const e = await res.json(); throw new Error(e.message); }
    } finally { setLoading(false); }
  }

  return (
    <CartContext.Provider value={{
      cart, ready, loading, refresh,
      addProduct: (productId, quantity = 1, personalisation) => call('/items', 'POST', { productId, quantity, ...(personalisation ? { personalisation } : {}) }),
      addPlan: (planId) => call('/items', 'POST', { subscriptionPlanId: planId }),
      updateItem: (itemId, quantity) => call(`/items/${itemId}`, 'PUT', { quantity }),
      removeItem: (itemId) => call(`/items/${itemId}`, 'DELETE'),
      applyCoupon: (code) => call('/coupon', 'POST', { code }),
      removeCoupon: () => call('/coupon', 'DELETE'),
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
