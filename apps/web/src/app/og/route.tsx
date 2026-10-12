import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';

/** Hosts a preview may take its photo from: our own site and API, and the image hosts the site already uses. */
function allowedImage(src: string | null): string | null {
  if (!src) return null;
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const own = [process.env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_SITE_URL, process.env.API_BASE_URL]
      .filter(Boolean).map((u) => new URL(u as string).host);
    const ok = own.includes(url.host) || /(^|\.)(unsplash\.com|amazonaws\.com|cloudflare\.com)$/.test(url.hostname);
    return ok ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The photo as a data URL, or nothing if it can't be fetched in time. */
async function photo(src: string | null) {
  if (!src) return null;
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !/^image\/(jpeg|png|webp|gif)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 5_000_000) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

// In apps/web/public/fonts, which the Docker image copies next to the server
// (the server runs from apps/web, in development and in production).
const font = (file: string) => readFile(join(process.cwd(), 'public', 'fonts', file));
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
/** The font has no lari sign: ₾12.90 is written 12.90 GEL. */
const lari = (s: string) => s.replace(/₾\s?([\d.,]+)/g, '$1 GEL').replace(/₾/g, 'GEL');

/**
 * The picture shown when a page is shared (WhatsApp, Messenger, Instagram,
 * Telegram, Viber, Facebook, X…): 1200×630 with the Pupbox mark, the page's
 * title and a short line, and the page's own photo when it has one.
 * /og?title=…&sub=…&img=…
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const title = clip(lari(q.get('title')?.trim() || 'Pupbox'), 80);
  const sub = clip(lari(q.get('sub')?.trim() || ''), 100);
  const [img, geo400, geo800, lat400, lat800] = await Promise.all([
    photo(allowedImage(q.get('img'))),
    font('georgian-400.woff'), font('georgian-800.woff'), font('latin-400.woff'), font('latin-800.woff'),
  ]);

  const paw = (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="#22A38B">
      <circle cx="6" cy="9" r="2.2" /><circle cx="10" cy="5.5" r="2.2" /><circle cx="14" cy="5.5" r="2.2" /><circle cx="18" cy="9" r="2.2" />
      <path d="M12 10.5c-3 0-6 3.6-6 6.4 0 1.9 1.4 2.6 3 2.6 1.3 0 2-.6 3-.6s1.7.6 3 .6c1.6 0 3-.7 3-2.6 0-2.8-3-6.4-6-6.4z" />
    </svg>
  );

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: 'linear-gradient(135deg, #F0FBF8 0%, #FFFFFF 55%, #F0F7FF 100%)', fontFamily: 'Latin, Georgian' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 56px 56px 72px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {paw}
            <span style={{ fontSize: 40, fontWeight: 800, color: '#22A38B' }}>Pupbox</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 400, overflow: 'hidden' }}>
            <div style={{ fontSize: title.length > 55 ? 44 : title.length > 35 ? 52 : 62, fontWeight: 800, color: '#24303A', lineHeight: 1.15 }}>{title}</div>
            {sub && <div style={{ fontSize: sub.length > 70 ? 24 : 28, color: '#52616D', lineHeight: 1.35 }}>{sub}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, color: '#1A8574', fontWeight: 800 }}>pupbox.ge</div>
        </div>
        {img ? (
          <div style={{ width: 470, display: 'flex', padding: '48px 48px 48px 0' }}>
            <img src={img} width={422} height={534} style={{ width: 422, height: 534, objectFit: 'cover', borderRadius: 40 }} />
          </div>
        ) : (
          <div style={{ width: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 300, height: 300, borderRadius: 150, background: '#DDF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="170" height="170" viewBox="0 0 24 24" fill="#22A38B">
                <circle cx="6" cy="9" r="2.2" /><circle cx="10" cy="5.5" r="2.2" /><circle cx="14" cy="5.5" r="2.2" /><circle cx="18" cy="9" r="2.2" />
                <path d="M12 10.5c-3 0-6 3.6-6 6.4 0 1.9 1.4 2.6 3 2.6 1.3 0 2-.6 3-.6s1.7.6 3 .6c1.6 0 3-.7 3-2.6 0-2.8-3-6.4-6-6.4z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Latin', data: lat400, weight: 400 }, { name: 'Latin', data: lat800, weight: 800 },
        { name: 'Georgian', data: geo400, weight: 400 }, { name: 'Georgian', data: geo800, weight: 800 },
      ],
      // Previews are fetched by every app that shows the link; keep them a day.
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' },
    },
  );
}
