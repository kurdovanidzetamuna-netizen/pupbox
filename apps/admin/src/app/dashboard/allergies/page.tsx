'use client';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import SideDrawer from '@/components/SideDrawer';
import { ActionButton } from '@/components/Toolbar';
import { api, can, getOr } from '@/lib/api';
import { forgetAllergens, type Allergen } from '@/lib/allergens';

type Form = { key: string; ka: string };

/**
 * Admin → Allergies: the ready-made list customers tick for their dog and
 * admin ticks on a product, in both languages. Monthly boxes warn when a box
 * holds something its dog reacts to. The English name is what dogs and
 * products keep, so it can't change after adding; the Georgian name can.
 * Taking one off the list keeps it on the dogs and products that have it.
 */
export default function AllergiesPage() {
  const [list, setList] = useState<Allergen[] | null>(null);
  const [editing, setEditing] = useState<Allergen | 'new' | null>(null);
  const [form, setForm] = useState<Form>({ key: '', ka: '' });
  const [start, setStart] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    setEdit(can('products.edit'));
    getOr<Allergen[]>('/admin/allergens', []).then(setList);
  }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t); } }, [toast]);

  const saveList = async (next: Allergen[]) => {
    setList(await api<Allergen[]>('/admin/allergens', { method: 'PUT', body: { allergens: next } }));
    forgetAllergens();
  };
  function open(a: Allergen | 'new') {
    const f = a === 'new' ? { key: '', ka: '' } : { key: a.key, ka: a.ka };
    setEditing(a); setForm(f); setStart(JSON.stringify(f)); setError('');
  }
  const dirty = useMemo(() => JSON.stringify(form) !== start, [form, start]);

  async function save() {
    const key = form.key.trim(), ka = form.ka.trim();
    if (!key || !ka) return setError('Add the name in both languages.');
    const all = list ?? [];
    if (editing === 'new' && all.some((a) => a.key.toLowerCase() === key.toLowerCase())) return setError('That one is already on the list.');
    setBusy(true);
    try {
      await saveList(editing === 'new' ? [...all, { key, ka }] : all.map((a) => (a.key === (editing as Allergen).key ? { key: a.key, ka } : a)));
      setToast(editing === 'new' ? 'Added' : 'Saved');
      setEditing(null);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove(a: Allergen) {
    if (!confirm(`Take “${a.key}” off the list? Dogs and products that have it keep it.`)) return;
    try { await saveList((list ?? []).filter((x) => x.key !== a.key)); setToast('Taken off'); } catch (e: any) { alert(e.message); }
  }
  async function move(i: number, dir: -1 | 1) {
    const next = [...(list ?? [])];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    try { await saveList(next); } catch (e: any) { alert(e.message); }
  }

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 28px)', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ flex: '1 1 260px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>⚠️ Allergies</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 0' }}>The ready-made list customers tick for their dog and you tick on a product. Customers can still type others.</p>
        </div>
        {edit && <ActionButton onClick={() => open('new')}>＋ Add</ActionButton>}
      </div>

      {!list ? <p style={{ color: 'var(--slate-400)' }}>Loading…</p> : (
        <div style={{ ...card, padding: 0 }}>
          {list.length === 0 && <p style={{ ...note, margin: 14 }}>The list is empty — customers can only type allergies by hand.</p>}
          {list.map((a, i) => (
            <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i ? '1px solid var(--slate-100)' : 'none', flexWrap: 'wrap' }}>
              {edit && list.length > 1 && (
                <div style={{ display: 'grid', gap: 2 }}>
                  <button type="button" aria-label={`Move ${a.key} up`} disabled={i === 0} onClick={() => move(i, -1)} style={{ ...arrow, opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                  <button type="button" aria-label={`Move ${a.key} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)} style={{ ...arrow, opacity: i === list.length - 1 ? 0.3 : 1 }}>▼</button>
                </div>
              )}
              <strong style={{ fontSize: 14, color: 'var(--slate-900)' }}>{a.key}</strong>
              <span style={{ fontSize: 13, color: a.ka ? 'var(--slate-500)' : 'var(--amber-700)', flex: 1 }}>{a.ka || 'no Georgian name yet'}</span>
              {edit && (
                <span style={{ display: 'flex', gap: 6 }}>
                  <ActionButton variant="secondary" onClick={() => open(a)} style={small}>Edit</ActionButton>
                  <ActionButton variant="secondary" onClick={() => remove(a)} style={{ ...small, color: 'var(--red-600)' }}>Remove</ActionButton>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <p style={{ ...note, marginTop: 12 }}>💡 Matching ignores letter case, so a dog with “chicken” and a product with “Chicken” still warn each other.</p>

      {toast && <div role="status" style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'var(--slate-900)', color: '#fff', padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 80 }}>{toast}</div>}

      <SideDrawer open={editing !== null} onClose={() => setEditing(null)} dirty={dirty && !busy} width={460}
        title={editing === 'new' ? 'Add an allergy' : `Edit ${editing?.key ?? ''}`} subtitle="Shown to customers in their language."
        footer={(close) => (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ActionButton variant="secondary" onClick={close}>Cancel</ActionButton>
            <span style={{ flex: 1 }} />
            <ActionButton onClick={save} disabled={busy || (editing !== 'new' && !dirty)}>{busy ? 'Saving…' : editing === 'new' ? 'Add' : 'Save changes'}</ActionButton>
          </div>
        )}>
        <label style={lab}>Name</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
          <input value={form.ka} onChange={(e) => { setForm((f) => ({ ...f, ka: e.target.value })); setError(''); }} maxLength={40} placeholder="🇬🇪 ინდაური" aria-label="Name in Georgian" style={inp} />
          <input value={form.key} onChange={(e) => { setForm((f) => ({ ...f, key: e.target.value })); setError(''); }} maxLength={40} placeholder="🇬🇧 Turkey" aria-label="Name in English"
            readOnly={editing !== 'new'} style={{ ...inp, ...(editing !== 'new' ? { background: 'var(--slate-50)', color: 'var(--slate-500)' } : {}) }} />
        </div>
        {editing !== 'new' && <p style={hint}>The English name is what dogs and products keep, so it stays as it is. To change it, add the new one and remove this one.</p>}
        {error && <p role="alert" style={{ color: 'var(--red-600)', fontSize: 13, fontWeight: 600, margin: '16px 0 0' }}>{error}</p>}
      </SideDrawer>
    </div>
  );
}

const card: CSSProperties = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16 };
const note: CSSProperties = { fontSize: 12.5, color: 'var(--slate-600)', background: 'var(--slate-50)', borderRadius: 10, padding: '8px 12px', lineHeight: 1.5, margin: 0 };
const inp: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', fontSize: 13.5, border: '1px solid var(--slate-200)', borderRadius: 10, outline: 'none', background: 'var(--white)', color: 'var(--slate-900)', fontFamily: 'inherit' };
const lab: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', margin: '16px 0 6px' };
const hint: CSSProperties = { fontSize: 11.5, color: 'var(--slate-400)', margin: '6px 0 0' };
const small: CSSProperties = { padding: '5px 12px', fontSize: 12 };
const arrow: CSSProperties = { border: '1px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-600)', borderRadius: 6, fontSize: 9, width: 26, height: 20, cursor: 'pointer', lineHeight: 1 };
