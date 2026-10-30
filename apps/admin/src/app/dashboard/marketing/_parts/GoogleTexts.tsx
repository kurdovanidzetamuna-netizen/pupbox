'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PAGES, cmsSlug, mergedSections } from '@pupbox/content';
import { getOr, post } from '@/lib/api';
import { btnSoft, card, h2, hintP, inp, lbl, note } from './shared';

// ── Google texts overview ──────────────────────────────────────────────────
export type Tx = { en: string; ka: string };
export type Entry = { kind: 'Page' | 'Product' | 'Category' | 'Blog post'; name: string; path: string; title: Tx; description: Tx; own: boolean; ownDesc?: boolean; editHref: string };
export const TITLE_MAX = 60, DESC_MIN = 70, DESC_MAX = 160;

export function problems(e: Entry, dupes: Set<string>): string[] {
  const out: string[] = [];
  const t = (e.title.ka || e.title.en).trim(), d = (e.description.ka || e.description.en).trim();
  if (t.length + (e.kind === 'Page' && e.path === '/' ? 0 : 9) > TITLE_MAX) out.push(`Title too long (${t.length})`);
  if (!d) out.push('No description');
  // A product without its own Google text gets its price and delivery added on the site (shop/[slug]).
  else if (d.length < DESC_MIN && !(e.kind === 'Product' && !e.ownDesc)) out.push(`Description short (${d.length})`);
  else if (d.length > DESC_MAX) out.push(`Description long (${d.length})`);
  if (!e.title.ka.trim() || (d && !e.description.ka.trim())) out.push('Georgian missing');
  if (t && dupes.has(t.toLowerCase())) out.push('Same title as another page');
  return out;
}

/** Every page's Google title and description, worst first, with a link to fix each. */
export function GoogleTexts() {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [only, setOnly] = useState(true);
  const [kind, setKind] = useState<string>('');

  useEffect(() => {
    const get = (u: string) => getOr<any>(u, null);
    (async () => {
      const pages = PAGES.filter((p) => p.sections.some((x) => x.id === 'seo'));
      const [list, ...stored] = await Promise.all([get('/admin/marketing/seo'), ...pages.map((p) => get(`/cms/admin/${cmsSlug(p)}`))]);
      const out: Entry[] = [];
      const gaps: string[] = [];
      if (stored.every((x) => x === null)) gaps.push('pages (needs “See site content”)');
      pages.forEach((p, i) => {
        if (stored[i] === null) return;
        const seo = mergedSections(p, stored[i]?.content ?? null).seo as any;
        out.push({ kind: 'Page', name: p.label, path: p.path ?? '/', title: { en: seo?.title?.en ?? '', ka: seo?.title?.ka ?? '' }, description: { en: seo?.description?.en ?? '', ka: seo?.description?.ka ?? '' }, own: true, editHref: `/dashboard/page-builder/${p.key}` });
      });
      const add = (k: Entry['kind'], items: any[] | undefined, href: (x: any) => string) => (items ?? []).forEach((x) => {
        const own = !!(x.title.ka || x.title.en);
        out.push({
          kind: k, name: x.name, path: x.path, own, ownDesc: !!(x.description.ka || x.description.en), editHref: href(x),
          title: own ? x.title : x.fallbackTitle,
          description: x.description.ka || x.description.en ? x.description : x.fallbackDescription,
        });
      });
      add('Product', list?.products, (x) => `/dashboard/products/${x.slug}/edit`);
      add('Category', list?.categories, () => '/dashboard/categories');
      add('Blog post', list?.posts, () => '/dashboard/blog');
      setMissing(gaps);
      setRows(out);
    })();
  }, []);

  const dupes = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of rows ?? []) { const t = (r.title.ka || r.title.en).trim().toLowerCase(); if (t) seen.set(t, (seen.get(t) ?? 0) + 1); }
    return new Set([...seen].filter(([, n]) => n > 1).map(([t]) => t));
  }, [rows]);

  if (!rows) return <p style={{ color: 'var(--slate-400)', marginTop: 16 }}>Loading every page…</p>;
  const scored = rows.map((r) => ({ r, p: problems(r, dupes) })).sort((a, b) => b.p.length - a.p.length);
  const shown = scored.filter((x) => (!only || x.p.length) && (!kind || x.r.kind === kind));
  const weak = scored.filter((x) => x.p.length).length;

  return (
    <section style={{ ...card, marginTop: 10 }}>
      <h2 style={h2}>Google texts</h2>
      <p style={hintP}>What Google shows for each page: a title up to ~60 characters (“ | Pupbox” is added) and a description of 70–160. Georgian is what Google reads first.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: weak ? 'var(--amber-700)' : 'var(--green-800)' }}>{weak ? `${weak} of ${rows.length} could be better` : `All ${rows.length} look good`}</span>
        <span style={{ flex: 1 }} />
        <label style={{ ...lbl }}><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Only ones to fix</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Show" style={{ ...inp, padding: '6px 10px' }}>
          <option value="">Everything</option>
          {['Page', 'Product', 'Category', 'Blog post'].map((k) => <option key={k} value={k}>{k}s</option>)}
        </select>
      </div>
      {missing.length > 0 && <p style={{ ...note, marginBottom: 10 }}>Not shown: {missing.join(', ')}.</p>}
      {shown.length === 0 && <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Nothing to fix here. 🎉</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {shown.map(({ r, p }, i) => (
          <li key={i} style={{ border: '1px solid var(--slate-200b)', borderRadius: 14, padding: 12, display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--slate-500)' }}>{r.kind}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-800)' }}>{r.name}</span>
              <span style={{ flex: 1 }} />
              <Link href={r.editHref} style={{ ...btnSoft, textDecoration: 'none', padding: '6px 11px', fontSize: 12.5 }}>Edit</Link>
            </div>
            {/* Google-style preview */}
            <div style={{ background: 'var(--slate-50)', borderRadius: 10, padding: '8px 10px', minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--slate-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>pupbox.ge › ka{r.path === '/' ? '' : r.path}</div>
              <div style={{ fontSize: 15, color: '#1a0dab', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(r.title.ka || r.title.en) + (r.path === '/' && r.kind === 'Page' ? '' : ' | Pupbox')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--slate-600)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description.ka || r.description.en || <i style={{ color: 'var(--slate-400)' }}>Google picks some text from the page</i>}</div>
            </div>
            {p.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {p.map((x) => <span key={x} style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'var(--amber-50)', color: 'var(--amber-700)' }}>{x}</span>)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
