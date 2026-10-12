/**
 * The API base, with the local default. Import this rather than reading
 * process.env.NEXT_PUBLIC_API_URL directly: the web app has no .env of its
 * own, so the bare variable is undefined in development and requests went to
 * "undefined/auth/login" — which is how /login and /register broke.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const { cache, next, headers, ...rest } = (options ?? {}) as RequestInit & { next?: { revalidate?: number } };

  // `cache` and `next.revalidate` are mutually exclusive. Spreading caller
  // options over a default `next: { revalidate: 60 }` left both set whenever a
  // caller asked for 'no-store', which makes Next's static generation hang
  // until the build worker is SIGTERM'd — it failed the production build
  // on / and /prices rather than surfacing as a runtime error.
  const caching = cache ? { cache } : { next: next ?? { revalidate: 60 } };

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    ...caching,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  products: {
    // Always fresh: stock, prices and photos change, and a saved copy showed
    // shoppers what was there before.
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchAPI<{ items: any[]; total: number; pages: number }>(`/products${qs}`, { cache: 'no-store' });
    },
    get: (slug: string) => fetchAPI<any>(`/products/${slug}`, { cache: 'no-store' }),
    brands: () => fetchAPI<string[]>('/products/brands'),
  },
  /** Sellers with something on sale (public face only). */
  customBox: {
    config: () => fetchAPI<{ minItems: number; packingFee: number; monthlyDiscount: number }>('/custom-box/config', { cache: 'no-store' }),
    products: () => fetchAPI<any[]>('/custom-box/products', { cache: 'no-store' }),
  },
  sellers: {
    list: () => fetchAPI<any[]>('/sellers', { cache: 'no-store' }),
  },
  categories: {
    list: () => fetchAPI<any[]>('/categories'),
  },
  plans: {
    list: () => fetchAPI<any[]>('/subscription-plans', { cache: 'no-store' }),
    get: (slug: string) => fetchAPI<any>(`/subscription-plans/${slug}`, { cache: 'no-store' }),
  },
  cms: {
    get: (slug: string) => fetchAPI<any>(`/cms/${slug}`).catch(() => null),
    getAll: () => fetchAPI<any[]>('/cms').catch(() => []),
  },
};

export const cms = {
  get: (slug: string) => fetchAPI<any>(`/cms/${slug}`).catch(() => null),
  getAll: () => fetchAPI<any[]>('/cms').catch(() => []),
};
