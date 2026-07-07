const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate: 60 },
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  products: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchAPI<{ items: any[]; total: number; pages: number }>(`/products${qs}`);
    },
    get: (slug: string) => fetchAPI<any>(`/products/${slug}`),
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
