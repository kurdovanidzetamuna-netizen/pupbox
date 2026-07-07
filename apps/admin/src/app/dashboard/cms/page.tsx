'use client';
import { useEffect, useState } from 'react';
import FormField, { inputClass } from '@/components/FormField';
import LangTabs, { type Lang } from '@/components/LangTabs';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const inp = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 };
const card = { background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' };

export default function AdminCmsPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [ka, setKa] = useState({ title: '', contentHtml: '', seoTitle: '', seoDesc: '' });
  const [lang, setLang] = useState<Lang>('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function token() { return localStorage.getItem('admin_token') || ''; }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/cms`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setPages(Array.isArray(data) ? data : []);
    } catch { } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    setSaving(true);
    const hasKa = Object.values(ka).some(v => v.trim() !== '');
    const body: any = { title: editing.title, seoTitle: editing.seoTitle, seoDesc: editing.seoDesc, status: editing.status, content: { html: editing.contentHtml } };
    if (hasKa) body.translations = { ka: { ...ka, content: { html: ka.contentHtml } } };
    await fetch(`${API}/cms/${editing.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setEditing(null);
    load();
  }

  async function createPage() {
    const slug = prompt('Page slug (e.g. "about", "terms"):');
    if (!slug) return;
    await fetch(`${API}/cms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ key: slug, title: slug, slug, status: 'DRAFT' }),
    });
    load();
  }

  if (editing) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Edit Page</h1>
            <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace', marginTop: 4 }}>/{editing.slug}</p>
          </div>
          <button onClick={() => setEditing(null)} style={{ fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>← Cancel</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <LangTabs lang={lang} onChange={setLang} />
              <div style={{ marginBottom: 14 }}>
                <FormField label="Title" required>
                  <input value={lang === 'en' ? editing.title : ka.title} onChange={e => lang === 'en' ? setEditing({ ...editing, title: e.target.value }) : setKa({ ...ka, title: e.target.value })} style={inputClass()} />
                </FormField>
              </div>
              <div>
                <FormField label="Content (HTML)">
                  <textarea
                    value={lang === 'en' ? (editing.contentHtml || editing.content?.html || '') : ka.contentHtml}
                    onChange={e => lang === 'en' ? setEditing({ ...editing, contentHtml: e.target.value }) : setKa({ ...ka, contentHtml: e.target.value })}
                    rows={18} style={{ ...inputClass(), resize: 'vertical', fontFamily: 'monospace', fontSize: 12 } as any} placeholder="<h1>About Pupbox</h1><p>...</p>"
                  />
                </FormField>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 14px' }}>Settings{lang === 'ka' ? ' / SEO (Georgian)' : ''}</p>
              {lang === 'en' && (
                <div style={{ marginBottom: 12 }}>
                  <FormField label="Status">
                    <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} style={inputClass()}>
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                    </select>
                  </FormField>
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <FormField label="SEO Title">
                  <input value={lang === 'en' ? (editing.seoTitle || '') : ka.seoTitle} onChange={e => lang === 'en' ? setEditing({ ...editing, seoTitle: e.target.value }) : setKa({ ...ka, seoTitle: e.target.value })} style={inputClass()} />
                </FormField>
              </div>
              <div>
                <FormField label="SEO Description">
                  <textarea value={lang === 'en' ? (editing.seoDesc || '') : ka.seoDesc} onChange={e => lang === 'en' ? setEditing({ ...editing, seoDesc: e.target.value }) : setKa({ ...ka, seoDesc: e.target.value })} rows={3} style={{ ...inputClass(), resize: 'none' } as any} />
                </FormField>
              </div>
            </div>
            <button onClick={save} disabled={saving} style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, width: '100%' }}>
              {saving ? 'Saving…' : 'Save Page'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>CMS Pages</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{pages.length} pages</p>
        </div>
        <button onClick={createPage} style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + New Page
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid #99f6e4', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : pages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#cbd5e1' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
            <p style={{ fontSize: 13 }}>No CMS pages yet</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Page', 'Slug', 'Status', 'Updated', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8ecf0', background: '#f8fafc' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 600, color: '#1e293b' }}>{p.title}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: 6 }}>/{p.slug}</span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...(p.status === 'PUBLISHED' ? { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } : { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }) }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: '#94a3b8' }}>
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <button onClick={() => { setEditing({ ...p }); const kaData = p.translations?.ka; setKa(kaData ? { title: kaData.title || '', contentHtml: kaData.content?.html || '', seoTitle: kaData.seoTitle || '', seoDesc: kaData.seoDesc || '' } : { title: '', contentHtml: '', seoTitle: '', seoDesc: '' }); setLang('en'); }} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
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
