'use client';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import SideDrawer from '@/components/SideDrawer';
import { ActionButton } from '@/components/Toolbar';
import { api, can, getOr } from '@/lib/api';

type Tag = { id: string; name: string; nameKa: string; slug: string; description: string | null; isActive: boolean; products: number };
type Form = { name: string; nameKa: string; description: string; isActive: boolean };
const EMPTY: Form = { name: '', nameKa: '', description: '', isActive: true };

/**
 * Admin → Tags: the small labels on a product page ("Grain free",
 * "Handmade"), in both languages. They also appear in the shop's filter
 * list. Put them on products in each product's form. A tag switched off
 * disappears from the site but stays on its products, ready to switch on.
 */
export default function TagsPage() {
  const [list, setList] = useState<Tag[] | null>(null);
  const [editing, setEditing] = useState<Tag | 'new' | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [start, setStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [edit, setEdit] = useState(false);

  const call = async (path: string, method: string, body?: unknown) => setList(await api<Tag[]>(`/admin/tags${path}`, { method, body }));
  useEffect(() => {
    setEdit(can('products.edit'));
    getOr<Tag[]>('/admin/tags', []).then(setList);
  }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t); } }, [toast]);

  function open(t: Tag | 'new') {
    const f: Form = t === 'new' ? EMPTY : { name: t.name, nameKa: t.nameKa, description: t.description ?? '', isActive: t.isActive };
    setEditing(t); setForm(f); setStart(JSON.stringify(f)); setError('');
  }
  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => { setForm((x) => ({ ...x, [k]: v })); setError(''); };
  const dirty = useMemo(() => JSON.stringify(form) !== start, [form, start]);

  async function save() {
    if (!form.name.trim() || !form.nameKa.trim()) return setError('Add the name in both languages.');
    setBusy(true);
    try {
      const body = { name: form.name.trim(), nameKa: form.nameKa.trim(), description: form.description.trim(), isActive: form.isActive };
      await call(editing === 'new' ? '' : `/${(editing as Tag).id}`, editing === 'new' ? 'POST' : 'PUT', body);
      setToast(editing === 'new' ? 'Tag added' : 'Saved');
      setEditing(null);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function quick(fn: () => Promise<unknown>, msg: string) {
    try { await fn(); setToast(msg); } catch (e: any) { alert(e.message); }
  }

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 28px)', maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ flex: '1 1 260px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>🏷️ Tags</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 0' }}>Small labels on product pages, in both languages. Add them to a product in its form.</p>
        </div>
        {edit && <ActionButton onClick={() => open('new')}>＋ New tag</ActionButton>}
      </div>

      {!list ? <p style={{ color: 'var(--slate-400)' }}>Loading…</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {list.length === 0 && <p style={note}>No tags yet. Add one, then pick it in a product’s form.</p>}
          {list.map((t) => (
            <div key={t.id} style={{ ...card, opacity: t.isActive ? 1 : 0.6, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 15, color: 'var(--slate-900)' }}>{t.name}</strong>
                  <span style={{ fontSize: 13, color: t.nameKa ? 'var(--slate-500)' : 'var(--amber-700)' }}>{t.nameKa || 'no Georgian name yet'}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: t.isActive ? 'var(--green-50)' : 'var(--slate-100)', color: t.isActive ? 'var(--green-800)' : 'var(--slate-500)' }}>{t.isActive ? 'On' : 'Off'}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 3 }}>
                  {t.products ? `on ${t.products} product${t.products === 1 ? '' : 's'}` : 'on no products yet'}
                  {t.description && <span style={{ color: 'var(--slate-400)' }}> · {t.description}</span>}
                </div>
              </div>
              {edit && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <ActionButton variant="secondary" onClick={() => open(t)} style={small}>Edit</ActionButton>
                  <ActionButton variant="secondary" style={small}
                    onClick={() => quick(() => call(`/${t.id}`, 'PUT', { name: t.name, nameKa: t.nameKa, description: t.description ?? '', isActive: !t.isActive }), t.isActive ? 'Switched off' : 'Switched on')}>
                    {t.isActive ? 'Switch off' : 'Switch on'}
                  </ActionButton>
                  <ActionButton variant="secondary" style={{ ...small, color: 'var(--red-600)' }}
                    onClick={() => { if (confirm(`Delete “${t.name}”?${t.products ? ` It comes off ${t.products} product${t.products === 1 ? '' : 's'}.` : ''} This can’t be undone.`)) quick(() => call(`/${t.id}`, 'DELETE'), 'Deleted'); }}>Delete</ActionButton>
                </div>
              )}
            </div>
          ))}
          <p style={{ ...note, marginTop: 4 }}>💡 Products without a brand also list their tags in the shop’s filter. Switching a tag off hides it everywhere on the site but keeps it on its products.</p>
        </div>
      )}

      {toast && <div role="status" style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'var(--slate-900)', color: '#fff', padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 80 }}>{toast}</div>}

      <SideDrawer open={editing !== null} onClose={() => setEditing(null)} dirty={dirty && !busy} width={480}
        title={editing === 'new' ? 'New tag' : 'Edit tag'} subtitle="Shown on product pages in the customer’s language."
        footer={(close) => (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ActionButton variant="secondary" onClick={close}>Cancel</ActionButton>
            <span style={{ flex: 1 }} />
            <ActionButton onClick={save} disabled={busy || (editing !== 'new' && !dirty)}>{busy ? 'Saving…' : editing === 'new' ? 'Add tag' : 'Save changes'}</ActionButton>
          </div>
        )}>
        <label style={lab}>Name</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
          <input value={form.nameKa} onChange={(e) => set('nameKa')(e.target.value)} maxLength={40} placeholder="🇬🇪 უმარცვლო" aria-label="Name in Georgian" style={inp} />
          <input value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={40} placeholder="🇬🇧 Grain free" aria-label="Name in English" style={inp} />
        </div>

        <label style={lab}>Note for the team <span style={{ fontWeight: 500, color: 'var(--slate-400)' }}>(optional, not shown on the site)</span></label>
        <input value={form.description} onChange={(e) => set('description')(e.target.value)} maxLength={200} placeholder="e.g. no wheat, corn or soy" aria-label="Note" style={inp} />

        <label style={{ ...lab, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive')(e.target.checked)} /> On — shown on the site
        </label>

        {error && <p role="alert" style={{ color: 'var(--red-600)', fontSize: 13, fontWeight: 600, margin: '16px 0 0' }}>{error}</p>}
      </SideDrawer>
    </div>
  );
}

const card: CSSProperties = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, padding: 14 };
const note: CSSProperties = { fontSize: 12.5, color: 'var(--slate-600)', background: 'var(--slate-50)', borderRadius: 10, padding: '8px 12px', lineHeight: 1.5, margin: 0 };
const inp: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', fontSize: 13.5, border: '1px solid var(--slate-200)', borderRadius: 10, outline: 'none', background: 'var(--white)', color: 'var(--slate-900)', fontFamily: 'inherit' };
const lab: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', margin: '16px 0 6px' };
const small: CSSProperties = { padding: '5px 12px', fontSize: 12 };
