'use client';
import { useEffect, useState } from 'react';
import FormField, { inputClass } from '@/components/FormField';
import LangTabs, { type Lang } from '@/components/LangTabs';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const inp = { width: '100%', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '9px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 };
const card = { background: 'var(--white)', borderRadius: 14, border: '1px solid var(--slate-200b)', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' };

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
      const res = await fetch(`${API}/cms/admin/all`, { headers: { Authorization: `Bearer ${token()}` } });
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
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Edit Page</h1>
            <p style={{ fontSize: 13, color: 'var(--slate-400)', fontFamily: 'monospace', marginTop: 4 }}>/{editing.slug}</p>
          </div>
          <button onClick={() => setEditing(null)} style={{ fontSize: 13, color: 'var(--slate-400)', background: 'none', border: 'none', cursor: 'pointer' }}>← Cancel</button>
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
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-700b)', margin: '0 0 14px' }}>Settings{lang === 'ka' ? ' / SEO (Georgian)' : ''}</p>
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
            <button onClick={save} disabled={saving} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, width: '100%' }}>
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
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>CMS Pages</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{pages.length} pages</p>
        </div>
        <button onClick={createPage} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + New Page
        </button>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : pages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
            <p style={{ fontSize: 13 }}>No CMS pages yet</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Page', 'Slug', 'Status', 'Updated', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--slate-50)' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--slate-800)' }}>{p.title}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--slate-100)', color: 'var(--slate-500)', padding: '3px 8px', borderRadius: 6 }}>/{p.slug}</span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...(p.status === 'PUBLISHED' ? { background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' } : { background: 'var(--amber-50)', color: 'var(--amber-700)', border: '1px solid var(--amber-200)' }) }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--slate-400)' }}>
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <button onClick={() => { setEditing({ ...p }); const kaData = p.translations?.ka; setKa(kaData ? { title: kaData.title || '', contentHtml: kaData.content?.html || '', seoTitle: kaData.seoTitle || '', seoDesc: kaData.seoDesc || '' } : { title: '', contentHtml: '', seoTitle: '', seoDesc: '' }); setLang('en'); }} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--blue-50)', color: 'var(--blue-600)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
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
