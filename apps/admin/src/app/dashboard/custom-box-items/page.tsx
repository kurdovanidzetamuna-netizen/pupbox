'use client';
import { useEffect, useState } from 'react';
import FormField, { inputClass } from '@/components/FormField';
import ErrorPopup from '@/components/ErrorPopup';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const EMOJI = ['🥩', '🍗', '🐟', '🧀', '🍪', '🥕', '🦴', '🦆', '🪢', '🏀', '🧩', '🐿️', '🪃', '🧸', '🧴', '🐾', '🦷', '🧤', '🌿', '🎀', '🥣', '🏷️', '🧣', '🛏️'];
const EMPTY = { emoji: '🦴', name: '', nameKa: '', short: '', shortKa: '', categoryId: '', price: '', stock: '50', popular: false, mystery: true, active: true };
type Form = typeof EMPTY;

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: bg, color, border: 'none', cursor: 'pointer', fontWeight: 600 });

/**
 * The build-your-own box catalogue: items customers tap into their box.
 * They are never sold in the shop. Each has an emoji, a name and a short
 * line in both languages, a price, stock and an optional "Popular" badge;
 * "mystery pool" lets one be packed as a surprise.
 */
export default function CustomBoxItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(EMPTY);
  const [edit, setEdit] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [popup, setPopup] = useState<string[]>([]);
  const token = () => localStorage.getItem('admin_token');

  async function load() {
    setLoading(true);
    const [p, c] = await Promise.all([
      fetch(`${API}/admin/products?limit=500`, { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`${API}/admin/categories`, { headers: { Authorization: `Bearer ${token()}` } }),
    ]);
    if (p.ok) { const d = await p.json(); setItems((d.items ?? []).filter((x: any) => x.inCustomBox && !x.standaloneSale)); }
    if (c.ok) { const d = await c.json(); setCats(d.items ?? d ?? []); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const set = (k: keyof Form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  function open(x?: any) {
    setEdit(x ?? null);
    setForm(x ? {
      emoji: x.boxEmoji || '🦴', name: x.name, nameKa: x.translations?.ka?.name ?? '', short: x.shortDescription ?? '', shortKa: x.translations?.ka?.shortDescription ?? '',
      categoryId: x.categoryId ?? '', price: String(Number(x.price)), stock: String(x.inventory?.quantity ?? 0), popular: !!x.boxPopular, mystery: !!x.inMystery, active: x.status !== 'INACTIVE',
    } : { ...EMPTY, categoryId: cats[0]?.id ?? '' });
    setErrors({}); setShow(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name (English) is required';
    if (!form.nameKa.trim()) errs.nameKa = 'Name (Georgian) is required';
    if (!(Number(form.price) > 0)) errs.price = 'Enter a price above 0';
    if (!(Number(form.stock) >= 0)) errs.stock = 'Stock can’t be negative';
    if (Object.keys(errs).length) { setErrors(errs); setPopup(Object.values(errs)); return; }
    setSaving(true);
    const body = {
      name: form.name.trim(), slug: edit?.slug ?? `box-${slugify(form.name)}-${Date.now().toString(36).slice(-4)}`, sku: edit?.sku ?? `CB-${Date.now().toString(36).toUpperCase()}`,
      price: Number(form.price), categoryId: form.categoryId || undefined, shortDescription: form.short.trim(),
      translations: { ...(edit?.translations ?? {}), ka: { ...(edit?.translations?.ka ?? {}), name: form.nameKa.trim(), shortDescription: form.shortKa.trim() } },
      status: form.active ? 'ACTIVE' : 'INACTIVE', standaloneSale: false, includedInBox: false, inCustomBox: true,
      inMystery: form.mystery, boxEmoji: form.emoji, boxPopular: form.popular, stockQuantity: Number(form.stock),
    };
    const res = await fetch(edit ? `${API}/admin/products/${edit.id}` : `${API}/admin/products`, {
      method: edit ? 'PUT' : 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) { setShow(false); load(); }
    else { const d = await res.json().catch(() => ({})); setPopup([Array.isArray(d.message) ? d.message.join(' ') : d.message || 'Could not save']); }
  }

  async function remove(x: any) {
    if (!confirm(`Remove “${x.name}” from the custom box?`)) return;
    const res = await fetch(`${API}/admin/products/${x.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) setPopup(['Could not remove it']);
    load();
  }

  const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)' };
  const td: React.CSSProperties = { padding: '12px 14px', color: 'var(--slate-600)' };
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? '—';

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Custom box items</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4, maxWidth: 680 }}>
            What customers can put in a box they build. These are not sold in the shop. Box rules (minimum items, packing fee, monthly discount, mystery item) are in Settings.
          </p>
        </div>
        <button onClick={() => open()} style={{ background: 'var(--teal-600)', color: 'var(--white)', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add item</button>
      </div>

      <ErrorPopup errors={popup} onClose={() => setPopup([])} />

      {show && (
        <form onSubmit={save} noValidate style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 14px' }}>{edit ? 'Edit item' : 'New item'}</p>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', margin: '0 0 8px' }}>Emoji</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 16 }}>
            {EMOJI.map((e) => (
              <button key={e} type="button" onClick={() => set('emoji', e)}
                style={{ width: 38, height: 38, borderRadius: 10, fontSize: 20, cursor: 'pointer', border: 'none', background: form.emoji === e ? 'var(--teal-50, #f0fdfa)' : 'var(--slate-50)', outline: form.emoji === e ? '2px solid var(--teal-500, #14b8a6)' : 'none' }}>{e}</button>
            ))}
            <input aria-label="Other emoji" value={form.emoji} onChange={(e) => set('emoji', e.target.value)} style={{ ...inputClass(), width: 70, textAlign: 'center', fontSize: 18 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <FormField label="Name (English)" required error={errors.name}><input style={inputClass(errors.name)} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Meat Chews" /></FormField>
            <FormField label="Name (Georgian)" required error={errors.nameKa}><input style={inputClass(errors.nameKa)} value={form.nameKa} onChange={(e) => set('nameKa', e.target.value)} placeholder="ხორცის საღეჭი" /></FormField>
            <FormField label="Short line (English)"><input style={inputClass()} maxLength={80} value={form.short} onChange={(e) => set('short', e.target.value)} placeholder="Natural dried meat snacks" /></FormField>
            <FormField label="Short line (Georgian)"><input style={inputClass()} maxLength={80} value={form.shortKa} onChange={(e) => set('shortKa', e.target.value)} placeholder="ბუნებრივი გამხმარი ხორცის ნუგბარი" /></FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <FormField label="Category">
              <select style={inputClass()} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Price ₾" required error={errors.price}><input style={inputClass(errors.price)} type="number" min={0} step="0.5" value={form.price} onChange={(e) => set('price', e.target.value)} /></FormField>
            <FormField label="In stock" error={errors.stock}><input style={inputClass(errors.stock)} type="number" min={0} value={form.stock} onChange={(e) => set('stock', e.target.value)} /></FormField>
          </div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', margin: '4px 0 18px' }}>
            {([['popular', '⭐ “Popular” badge'], ['mystery', '🎁 Can be packed as a mystery item'], ['active', 'Shown in the builder']] as const).map(([k, label]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate-700)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} />{label}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : edit ? 'Save changes' : 'Add item'}</button>
            <button type="button" onClick={() => setShow(false)} style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden' }}>
        {loading ? <p style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>Loading…</p>
          : items.length === 0 ? <p style={{ padding: 50, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>No items yet. Add the first thing customers can put in their box.</p>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['Item', 'Category', 'Price', 'Stock', 'Badges', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {items.map((x) => (
                  <tr key={x.id} style={{ borderBottom: '1px solid var(--slate-50)', opacity: x.status === 'INACTIVE' ? 0.5 : 1 }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--slate-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{x.boxEmoji || '📦'}</span>
                        <span><span style={{ display: 'block', fontWeight: 700, color: 'var(--slate-800)' }}>{x.translations?.ka?.name || x.name}</span><span style={{ fontSize: 11, color: 'var(--slate-400)' }}>{x.name} · {x.shortDescription}</span></span>
                      </div>
                    </td>
                    <td style={td}>{catName(x.categoryId)}</td>
                    <td style={td}>₾{Number(x.price).toFixed(2)}</td>
                    <td style={{ ...td, color: (x.inventory?.quantity ?? 0) <= (x.inventory?.lowStockAlert ?? 5) ? 'var(--red-600)' : td.color, fontWeight: 600 }}>{x.inventory?.quantity ?? 0}</td>
                    <td style={td}>{[x.boxPopular && '⭐ Popular', x.inMystery && '🎁 Mystery pool', x.status === 'INACTIVE' && 'Hidden'].filter(Boolean).join(' · ') || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => open(x)} style={btn('var(--blue-50)', 'var(--blue-600)')}>Edit</button>{' '}
                      <button onClick={() => remove(x)} style={btn('var(--rose-50)', 'var(--rose-700)')}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
