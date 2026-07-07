'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function getSessionId() {
  if (typeof window === 'undefined') return 'guest';
  let sid = localStorage.getItem('pupbox_session');
  if (!sid) { sid = Math.random().toString(36).slice(2); localStorage.setItem('pupbox_session', sid); }
  return sid;
}

function getHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pupbox_token') : null;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : { 'x-session-id': getSessionId() }) };
}

interface CartContextType {
  cart: any;
  loading: boolean;
  addProduct: (productId: string, quantity?: number) => Promise<void>;
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

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/cart`, { headers: getHeaders() });
      if (res.ok) setCart(await res.json());
    } catch {}
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
      cart, loading, refresh,
      addProduct: (productId, quantity = 1) => call('/items', 'POST', { productId, quantity }),
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
