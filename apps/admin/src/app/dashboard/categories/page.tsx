'use client';
import { useState, useEffect } from 'react';
import FormField, { inputClass, parseFieldErrors } from '@/components/FormField';
import LangTabs, { type Lang } from '@/components/LangTabs';
import ErrorPopup from '@/components/ErrorPopup';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const EMPTY_FORM = { name: '', slug: '', description: '', seoTitle: '', seoDesc: '', sortOrder: '0' };
const EMPTY_KA = { name: '', description: '', seoTitle: '', seoDesc: '' };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [popupErrors, setPopupErrors] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [ka, setKa] = useState({ ...EMPTY_KA });
  const [lang, setLang] = useState<Lang>('en');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API}/admin/categories`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowForm(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  function set(key: string, value: string) {
    setForm(f => {
      const next = { ...f, [key]: value };
      if (key === 'name' && editId === null && !f.slug) {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      return next;
    });
  }

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setKa({ ...EMPTY_KA });
    setLang('en');
    setError('');
    setFieldErrors({});
    setShowForm(true);
  }

  function openEdit(cat: any) {
    setEditId(cat.id);
    setForm({ name: cat.name || '', slug: cat.slug || '', description: cat.description || '', seoTitle: cat.seoTitle || '', seoDesc: cat.seoDesc || '', sortOrder: String(cat.sortOrder ?? 0) });
    const kaData = cat.translations?.ka;
    setKa(kaData ? { name: kaData.name || '', description: kaData.description || '', seoTitle: kaData.seoTitle || '', seoDesc: kaData.seoDesc || '' } : { ...EMPTY_KA });
    setLang('en');
    setError('');
    setFieldErrors({});
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Category name (English) is required';
    if (!form.slug.trim()) errs.slug = 'Slug is required';
    if (!ka.name.trim()) errs.kaName = 'Category name (Georgian) is required';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setPopupErrors(Object.values(errs));
      return;
    }
    setSaving(true);
    setError('');
    setFieldErrors({});
    const token = localStorage.getItem('admin_token');
    const hasKa = Object.values(ka).some(v => v.trim() !== '');
    const body: any = { name: form.name, slug: form.slug, description: form.description || undefined, seoTitle: form.seoTitle || undefined, seoDesc: form.seoDesc || undefined, sortOrder: Number(form.sortOrder) };
    if (hasKa) body.translations = { ka: { ...ka } };
    const url = editId ? `${API}/admin/categories/${editId}` : `${API}/admin/categories`;
    const res = await fetch(url, {
      method: editId ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowForm(false);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      if (Array.isArray(d.message)) {
        setFieldErrors(parseFieldErrors(d.message));
        setError('Please fix the errors below.');
      } else {
        setError(d.message || 'Save failed');
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem('admin_token');
    await fetch(`${API}/admin/categories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setDeleteConfirm(null);
    load();
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Categories</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{categories.length} categories</p>
        </div>
        <button onClick={openCreate} style={{ background: 'var(--teal-600)', color: 'var(--white)', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          + Add Category
        </button>
      </div>

      <ErrorPopup errors={popupErrors} onClose={() => setPopupErrors([])} />
      {/* Form panel */}
      {showForm && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 18px' }}>{editId ? 'Edit Category' : 'New Category'}</p>
          {error && <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12 }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <LangTabs lang={lang} onChange={setLang} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <FormField label="Name" required error={lang === 'en' ? fieldErrors.name : fieldErrors.kaName}>
                  <input style={inputClass(lang === 'en' ? fieldErrors.name : fieldErrors.kaName)} value={lang === 'en' ? form.name : ka.name} onChange={e => lang === 'en' ? set('name', e.target.value) : setKa(k => ({ ...k, name: e.target.value }))} />
                </FormField>
              </div>
              {lang === 'en' && (
                <div>
                  <FormField label="Slug" required error={fieldErrors.slug}>
                    <input style={inputClass(fieldErrors.slug)} value={form.slug} onChange={e => set('slug', e.target.value)} />
                  </FormField>
                </div>
              )}
              <div>
                <FormField label="Description">
                  <input style={inputClass()} value={lang === 'en' ? form.description : ka.description} onChange={e => lang === 'en' ? set('description', e.target.value) : setKa(k => ({ ...k, description: e.target.value }))} />
                </FormField>
              </div>
              {lang === 'en' && (
                <div>
                  <FormField label="Sort Order">
                    <input style={inputClass()} type="number" value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)} />
                  </FormField>
                </div>
              )}
              <div>
                <FormField label="SEO Title">
                  <input style={inputClass()} value={lang === 'en' ? form.seoTitle : ka.seoTitle} onChange={e => lang === 'en' ? set('seoTitle', e.target.value) : setKa(k => ({ ...k, seoTitle: e.target.value }))} />
                </FormField>
              </div>
              <div>
                <FormField label="SEO Description">
                  <input style={inputClass()} value={lang === 'en' ? form.seoDesc : ka.seoDesc} onChange={e => lang === 'en' ? set('seoDesc', e.target.value) : setKa(k => ({ ...k, seoDesc: e.target.value }))} />
                </FormField>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%' }} />
          </div>
        ) : categories.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🗂️</div>
            <p style={{ fontSize: 13 }}>No categories yet</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Name', 'Slug', 'Description', 'Sort', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat: any) => (
                <tr key={cat.id} style={{ borderBottom: '1px solid var(--slate-50)' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--slate-800)' }}>{cat.name}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--slate-500)', background: 'var(--slate-100)', padding: '3px 8px', borderRadius: 6 }}>{cat.slug}</span>
                  </td>
                  <td style={{ padding: '14px 18px', color: 'var(--slate-500)', maxWidth: 200 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.description || '—'}</span>
                  </td>
                  <td style={{ padding: '14px 18px', color: 'var(--slate-500)', textAlign: 'center' }}>{cat.sortOrder ?? 0}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...(cat.isActive !== false ? { background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' } : { background: 'var(--slate-50)', color: 'var(--slate-500)', border: '1px solid var(--slate-200)' }) }}>
                      {cat.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(cat)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--blue-50)', color: 'var(--blue-600)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                      {deleteConfirm === cat.id ? (
                        <>
                          <button onClick={() => handleDelete(cat.id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Confirm</button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--slate-100)', color: 'var(--slate-500)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteConfirm(cat.id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--rose-50)', color: 'var(--rose-700)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
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
