import { API_URL } from '@/lib/api';
import type { PublicMarketing } from '@/lib/tracking';

/**
 * Admin → SEO & tracking, as the site may see it (never the Meta token).
 * Read by every page on the server, refreshed at most once a minute; if the
 * API can't be reached, pages carry on without tracking.
 */
export async function getMarketing(): Promise<PublicMarketing | null> {
  try {
    const res = await fetch(`${API_URL}/marketing/config`, { next: { revalidate: 60 } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
