'use client';
import { useEffect, useState } from 'react';
import FormField, { inputClass, parseFieldErrors } from '@/components/FormField';
import ErrorPopup from '@/components/ErrorPopup';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const EMPTY = { name: '', slug: '', logoUrl: '', description: '', descriptionKa: '', contactName: '', email: '', phone: '', notes: '', isActive: true };
type Form = typeof EMPTY;

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: bg, color, border: 'none', cursor: 'pointer', fontWeight: 600 });

/**
 * The businesses we sell for. Name, logo and a short line are shown on the
 * shop; contacts and notes stay here. Products are linked to a seller (and
 * get the seller's price and our margin) on the product's own page.
 */
export default function SellersPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [popupErrors, setPopupErrors] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const token = () => localStorage.getItem('admin_token');

  async function load() {
    setLoading(true);
    const res = await fetch(`${API}/admin/sellers`, { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) setList(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const set = (k: keyof Form, v: any) => setForm((f) => {
    const next = { ...f, [k]: v };
    if (k === 'name' && !editId && (!f.slug || f.slug === slugify(f.name))) next.slug = slugify(v);
    return next;
  });

  function open(s?: any) {
    setEditId(s?.id ?? null);
    setForm(s ? {
      name: s.name ?? '', slug: s.slug ?? '', logoUrl: s.logoUrl ?? '', description: s.description ?? '', descriptionKa: s.translations?.ka?.description ?? '',
      contactName: s.contactName ?? '', email: s.email ?? '', phone: s.phone ?? '', notes: s.notes ?? '', isActive: s.isActive !== false,
    } : EMPTY);
    setError(''); setFieldErrors({}); setShowForm(true);
  }

  async function uploadLogo(file?: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch(`${API}/admin/upload/image`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.url) set('logoUrl', d.url); else setError(d.message || 'Upload failed');
    } finally { setUploading(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Seller name is required';
    if (!form.slug.trim()) errs.slug = 'Slug is required';
    if (Object.keys(errs).length) { setFieldErrors(errs); setPopupErrors(Object.values(errs)); return; }
    setSaving(true); setError(''); setFieldErrors({});
    const res = await fetch(editId ? `${API}/admin/sellers/${editId}` : `${API}/admin/sellers`, {
      method: editId ? 'PATCH' : 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); load(); }
    else {
      const d = await res.json().catch(() => ({}));
      if (Array.isArray(d.message)) { setFieldErrors(parseFieldErrors(d.message)); setError('Please fix the errors below.'); }
      else setError(d.message || 'Save failed');
    }
    setSaving(false);
  }

  async function remove(id: string) {
    const res = await fetch(`${API}/admin/sellers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setDeleteConfirm(null);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setPopupErrors([d.message || 'Could not delete']); }
    load();
  }

  const th: React.CSSProperties = { padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)' };
  const td: React.CSSProperties = { padding: '14px 18px', color: 'var(--slate-600)' };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Sellers</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>Businesses we sell for. Link a product to a seller on the product’s page; its shop price is the seller’s price plus our margin.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
        <a href="/dashboard/seller-payouts" style={{ background: 'var(--slate-100)', color: 'var(--slate-700)', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>₾ Payouts</a>
        <button onClick={() => open()} style={{ background: 'var(--teal-600)', color: 'var(--white)', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add seller</button>
        </div>
      </div>

      <ErrorPopup errors={popupErrors} onClose={() => setPopupErrors([])} />

      {showForm && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 18px' }}>{editId ? 'Edit seller' : 'New seller'}</p>
          {error && <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12 }}>{error}</div>}
          <form onSubmit={save}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', margin: '0 0 10px' }}>Shown on the shop</p>
            <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr 1fr', gap: 14, marginBottom: 14, alignItems: 'start' }}>
              <label style={{ width: 96, height: 96, borderRadius: 16, border: '2px dashed var(--slate-300)', background: 'var(--slate-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', fontSize: 11, color: 'var(--slate-400)', textAlign: 'center' }} title="Logo">
                <input type="file" accept=".jpg,.jpeg,.png,.svg,.webp" style={{ display: 'none' }} onChange={(e) => uploadLogo(e.target.files?.[0])} />
                {form.logoUrl ? <img src={form.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : uploading ? 'Uploading…' : 'Logo'}
              </label>
              <FormField label="Name" required error={fieldErrors.name}>
                <input style={inputClass(fieldErrors.name)} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Happy Paws Bakery" />
              </FormField>
              <FormField label="Slug" required error={fieldErrors.slug}>
                <input style={inputClass(fieldErrors.slug)} value={form.slug} onChange={(e) => set('slug', e.target.value)} />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              <FormField label="Short line (English)">
                <input style={inputClass()} maxLength={300} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Handmade treats from Tbilisi" />
              </FormField>
              <FormField label="Short line (Georgian)">
                <input style={inputClass()} maxLength={300} value={form.descriptionKa} onChange={(e) => set('descriptionKa', e.target.value)} placeholder="ხელნაკეთი ნუგბარი თბილისიდან" />
              </FormField>
            </div>

            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', margin: '0 0 10px' }}>Internal (never shown on the shop)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <FormField label="Contact person"><input style={inputClass()} value={form.contactName} onChange={(e) => set('contactName', e.target.value)} /></FormField>
              <FormField label="Email" error={fieldErrors.email}><input style={inputClass(fieldErrors.email)} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></FormField>
              <FormField label="Phone"><input style={inputClass()} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></FormField>
            </div>
            <FormField label="Notes (terms, payout details…)">
              <textarea style={{ ...inputClass(), minHeight: 70, resize: 'vertical' }} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </FormField>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate-700)', margin: '14px 0 18px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
              Active (switch off to hide the seller from the shop’s filter)
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : editId ? 'Save changes' : 'Create'}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>Loading…</p>
        ) : list.length === 0 ? (
          <div style={{ padding: '70px 0', textAlign: 'center', color: 'var(--slate-400)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏪</div>
            <p style={{ fontSize: 13 }}>No sellers yet. Everything in the shop is ours.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Seller', 'Products', 'Contact', 'Status', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--slate-50)' }}>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--slate-100)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {s.logoUrl ? <img src={s.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏪'}
                      </span>
                      <span>
                        <span style={{ display: 'block', fontWeight: 700, color: 'var(--slate-800)' }}>{s.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>{s.description || s.slug}</span>
                      </span>
                    </div>
                  </td>
                  <td style={td}><a href={`/dashboard/products?seller=${s.id}`} style={{ color: 'var(--teal-700, #0f766e)', fontWeight: 600, textDecoration: 'none' }}>{s._count?.products ?? 0}</a></td>
                  <td style={td}>{[s.contactName, s.phone, s.email].filter(Boolean).join(' · ') || '—'}</td>
                  <td style={td}>
                    <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...(s.isActive ? { background: 'var(--green-50)', color: 'var(--green-800)' } : { background: 'var(--slate-100)', color: 'var(--slate-500)' }) }}>{s.isActive ? 'Active' : 'Off'}</span>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button onClick={() => open(s)} style={btn('var(--blue-50)', 'var(--blue-600)')}>Edit</button>
                      {deleteConfirm === s.id ? (<>
                        <button onClick={() => remove(s.id)} style={btn('var(--red-50)', 'var(--red-600)')}>Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} style={btn('var(--slate-100)', 'var(--slate-500)')}>Cancel</button>
                      </>) : (
                        <button onClick={() => setDeleteConfirm(s.id)} style={btn('var(--rose-50)', 'var(--rose-700)')}>Delete</button>
                      )}
                    </div>
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
