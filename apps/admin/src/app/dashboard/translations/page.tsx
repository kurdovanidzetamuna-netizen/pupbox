'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PAGE_BUILDER_KEYS, BUILT_IN_STRINGS, STRING_AREAS, stringArea } from '@pupbox/content';
import { ActionButton, StatCard, StatCards, Pagination } from '../../../components/Toolbar';
import { api, post, saveCsv } from '@/lib/api';


type Saved = { key: string; en: string; ka: string };
type Row = { key: string; area: string; en: string; ka: string; defEn: string; defKa: string };

/**
 * Every text the site shows from code: buttons, forms, messages. Page text,
 * the header and the footer are edited in the Page Builder instead, so they
 * aren't listed (two places for the same words, and only one would work).
 */
const ALL: Row[] = Object.entries(BUILT_IN_STRINGS)
  .filter(([key]) => !PAGE_BUILDER_KEYS.has(key))
  .map(([key, v]) => ({ key, area: stringArea(key), en: v.en, ka: v.ka, defEn: v.en, defKa: v.ka }));

const changed = (r: Row) => r.en !== r.defEn || r.ka !== r.defKa;

function TextRow({ r, onSave, onReset }: { r: Row; onSave: (key: string, en: string, ka: string) => void; onReset: (key: string) => void }) {
  const [en, setEn] = useState(r.en);
  const [ka, setKa] = useState(r.ka);
  useEffect(() => { setEn(r.en); setKa(r.ka); }, [r.en, r.ka]);
  const dirty = en !== r.en || ka !== r.ka;
  const canSave = en.trim() !== '' && ka.trim() !== '';
  const area = STRING_AREAS.find((a) => a.key === r.area);
  const box = (missing: boolean): React.CSSProperties => ({
    width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 8, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
    border: `1px solid ${missing ? 'var(--amber-200)' : 'var(--slate-200)'}`, background: missing ? 'var(--amber-50)' : 'var(--slate-50)', color: 'var(--slate-900)',
  });
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--slate-100)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <code style={{ fontSize: 11.5, background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '2px 7px', borderRadius: 5, wordBreak: 'break-all' }}>{r.key}</code>
        {area && <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>{area.icon} {area.label}</span>}
        {changed(r) && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--teal-600)', background: 'var(--teal-50)', borderRadius: 999, padding: '2px 8px' }}>Changed</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {dirty && <ActionButton variant="secondary" onClick={() => { setEn(r.en); setKa(r.ka); }} style={{ padding: '4px 10px', fontSize: 12 }}>Cancel</ActionButton>}
          {dirty && <ActionButton onClick={() => canSave && onSave(r.key, en, ka)} disabled={!canSave} style={{ padding: '4px 12px', fontSize: 12 }}>Save</ActionButton>}
          {!dirty && changed(r) && <ActionButton variant="secondary" onClick={() => onReset(r.key)} style={{ padding: '4px 10px', fontSize: 12 }} >↺ Original</ActionButton>}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
        <textarea aria-label={`${r.key} in English`} value={en} onChange={(e) => setEn(e.target.value)} rows={en.length > 70 ? 3 : 1} placeholder="English" style={box(!en.trim())} />
        <textarea aria-label={`${r.key} in Georgian`} value={ka} onChange={(e) => setKa(e.target.value)} rows={ka.length > 60 ? 3 : 1} placeholder="Georgian" style={box(!ka.trim())} />
      </div>
    </div>
  );
}

export default function TranslationsPage() {
  const [rows, setRows] = useState<Row[]>(ALL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [area, setArea] = useState('all');
  const [search, setSearch] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);


  // What admin changed earlier, laid over the built-in text. Saved keys the
  // site no longer uses are left out (they changed nothing).
  useEffect(() => {
    api('/cms/admin/config-translations')
      .then((data) => {
        const list: Saved[] = data?.content?.strings || [];
        const by = new Map(list.map((s) => [s.key, s]));
        setRows(ALL.map((r) => { const s = by.get(r.key); return s ? { ...r, en: s.en || r.defEn, ka: s.ka || r.defKa } : r; }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /** Only the texts that differ from the built-in ones are stored. */
  async function persist(next: Row[]) {
    setSaving(true); setFailed(false);
    try {
      const strings = next.filter(changed).map((r) => ({ id: r.key, key: r.key, en: r.en, ka: r.ka, pages: [r.area] }));
      await post('/cms', { key: 'config-translations', slug: 'config-translations', title: 'Translations', status: 'PUBLISHED', content: { strings } });
      setRows(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { setFailed(true); } finally { setSaving(false); }
  }
  const save = (key: string, en: string, ka: string) => persist(rows.map((r) => (r.key === key ? { ...r, en, ka } : r)));
  const reset = (key: string) => persist(rows.map((r) => (r.key === key ? { ...r, en: r.defEn, ka: r.defKa } : r)));

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((r) => (area === 'all' || r.area === area) && (!onlyChanged || changed(r))
    && (!q || r.key.toLowerCase().includes(q) || r.en.toLowerCase().includes(q) || r.ka.toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shown = filtered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  useEffect(() => { setPage(1); }, [area, q, onlyChanged, pageSize]);
  const changedCount = rows.filter(changed).length;

  const chip = (on: boolean): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${on ? 'var(--teal-600)' : 'transparent'}`, background: on ? 'var(--teal-50)' : 'var(--slate-100)', color: on ? 'var(--teal-600)' : 'var(--slate-500)' });

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 4px' }}>Translations</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0, maxWidth: 640 }}>Every button, form and message on the site, in English and Georgian. Page text, the header and the footer are in <Link href="/dashboard/page-builder/homepage" style={{ color: 'var(--teal-600)', fontWeight: 600 }}>Page Builder</Link>.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saving && <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Saving…</span>}
          {saved && <span style={{ fontSize: 12, color: 'var(--emerald-500)', fontWeight: 600 }}>✓ Saved</span>}
          {failed && <span style={{ fontSize: 12, color: 'var(--red-600)', fontWeight: 600 }}>Not saved — try again</span>}
          <ActionButton variant="secondary" onClick={() => {
            const out: string[][] = [['Key', 'Area', 'English', 'Georgian', 'Changed']];
            rows.forEach((r) => out.push([r.key, STRING_AREAS.find((a) => a.key === r.area)?.label ?? '', r.en, r.ka, changed(r) ? 'yes' : '']));
            saveCsv(out, 'translations.csv');
          }}>↓ Export CSV</ActionButton>
        </div>
      </div>

      <StatCards>
        <StatCard theme="slate" value={rows.length} label="Texts on the site" />
        <StatCard theme="teal" value={changedCount} label="Changed here" />
        <StatCard theme={rows.some((r) => !r.ka.trim()) ? 'red' : 'teal'} value={rows.filter((r) => !r.ka.trim()).length} label="Missing Georgian" />
      </StatCards>

      <div style={{ display: 'flex', gap: 8, margin: '16px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setArea('all')} style={chip(area === 'all')}>All</button>
        {STRING_AREAS.map((a) => <button key={a.key} type="button" onClick={() => setArea(a.key)} style={chip(area === a.key)}>{a.icon} {a.label}</button>)}
        <button type="button" onClick={() => setOnlyChanged((v) => !v)} style={chip(onlyChanged)}>Changed only</button>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search key, English or Georgian…" aria-label="Search texts"
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 30px 8px 12px', fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 9, outline: 'none', background: 'var(--white)', color: 'var(--slate-900)' }} />
          {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--slate-400)', padding: 0 }}>×</button>}
        </div>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--slate-400)', fontSize: 13 }}>Loading…</p>
        ) : shown.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--slate-400)', fontSize: 13 }}>No texts match.</p>
        ) : shown.map((r) => <TextRow key={r.key} r={r} onSave={save} onReset={reset} />)}
      </div>
      {filtered.length > pageSize && (
        <div style={{ marginTop: 12 }}>
          <Pagination page={Math.min(page, pages)} totalPages={pages} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} pageSizeOptions={[25, 50, 100]} />
        </div>
      )}
    </div>
  );
}
