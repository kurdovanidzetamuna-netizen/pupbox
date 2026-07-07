'use client';
import { useEffect, useState } from 'react';
import FormField, { inputClass } from '@/components/FormField';
import LangTabs, { type Lang } from '@/components/LangTabs';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const EMPTY = { title: '', slug: '', excerpt: '', content: '', featuredImage: '', authorName: '', status: 'DRAFT', seoTitle: '', seoDesc: '' };
const EMPTY_KA = { title: '', excerpt: '', content: '', seoTitle: '', seoDesc: '' };

const inp = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 };
const card = { background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' };

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [ka, setKa] = useState<any>({ ...EMPTY_KA });
  const [lang, setLang] = useState<Lang>('en');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function token() { return localStorage.getItem('admin_token') || ''; }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/blog/admin/posts?limit=50`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } catch { } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function autoSlug(title: string) { return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  async function save() {
    if (!editing) return;
    setSaving(true);
    const hasKa = Object.values(ka).some((v: any) => String(v).trim() !== '');
    const body = { ...editing };
    if (hasKa) body.translations = { ka: { ...ka } };
    const method = editing.id ? 'PUT' : 'POST';
    const url = editing.id ? `${API}/blog/admin/posts/${editing.id}` : `${API}/blog/admin/posts`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(body) });
    setSaving(false);
    setEditing(null);
    load();
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return;
    setDeleting(id);
    await fetch(`${API}/blog/admin/posts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setDeleting(null);
    load();
  }

  const STATUS_BADGE: Record<string, any> = {
    PUBLISHED: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
    DRAFT:     { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' },
    ARCHIVED:  { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' },
  };

  if (editing !== null) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>{editing.id ? 'Edit Post' : 'New Post'}</h1>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{editing.id ? `Editing: ${editing.title || 'Untitled'}` : 'Create a new blog post'}</p>
          </div>
          <button onClick={() => setEditing(null)} style={{ fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>← Cancel</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <LangTabs lang={lang} onChange={setLang} />
              <div style={{ marginBottom: 14 }}>
                <FormField label="Title" required>
                  <input
                    value={lang === 'en' ? editing.title : ka.title}
                    onChange={e => lang === 'en' ? setEditing({ ...editing, title: e.target.value, slug: editing.id ? editing.slug : autoSlug(e.target.value) }) : setKa({ ...ka, title: e.target.value })}
                    style={inputClass()} placeholder="My awesome post"
                  />
                </FormField>
              </div>
              {lang === 'en' && (
                <div style={{ marginBottom: 14 }}>
                  <FormField label="Slug">
                    <input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} style={{ ...inputClass(), fontFamily: 'monospace' }} />
                  </FormField>
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <FormField label="Excerpt">
                  <textarea
                    value={lang === 'en' ? editing.excerpt : ka.excerpt}
                    onChange={e => lang === 'en' ? setEditing({ ...editing, excerpt: e.target.value }) : setKa({ ...ka, excerpt: e.target.value })}
                    rows={2} style={{ ...inputClass(), resize: 'none' } as any} placeholder="Short description shown in listings"
                  />
                </FormField>
              </div>
              <div>
                <FormField label="Content (HTML)">
                  <textarea
                    value={lang === 'en' ? editing.content : ka.content}
                    onChange={e => lang === 'en' ? setEditing({ ...editing, content: e.target.value }) : setKa({ ...ka, content: e.target.value })}
                    rows={16} style={{ ...inputClass(), resize: 'vertical', fontFamily: 'monospace', fontSize: 12 } as any} placeholder="<p>Start writing...</p>"
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {lang === 'en' && (
              <div style={card}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 14px' }}>Publish Settings</p>
                <div style={{ marginBottom: 12 }}>
                  <FormField label="Status">
                    <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} style={inputClass()}>
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </FormField>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <FormField label="Author">
                    <input value={editing.authorName} onChange={e => setEditing({ ...editing, authorName: e.target.value })} style={inputClass()} placeholder="Pupbox Team" />
                  </FormField>
                </div>
                <div>
                  <FormField label="Featured Image URL">
                    <input value={editing.featuredImage} onChange={e => setEditing({ ...editing, featuredImage: e.target.value })} style={inputClass()} placeholder="https://..." />
                  </FormField>
                </div>
              </div>
            )}
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 14px' }}>SEO{lang === 'ka' ? ' (Georgian)' : ''}</p>
              <div style={{ marginBottom: 12 }}>
                <FormField label="Meta Title">
                  <input value={lang === 'en' ? editing.seoTitle : ka.seoTitle} onChange={e => lang === 'en' ? setEditing({ ...editing, seoTitle: e.target.value }) : setKa({ ...ka, seoTitle: e.target.value })} style={inputClass()} />
                </FormField>
              </div>
              <div>
                <FormField label="Meta Description">
                  <textarea value={lang === 'en' ? editing.seoDesc : ka.seoDesc} onChange={e => lang === 'en' ? setEditing({ ...editing, seoDesc: e.target.value }) : setKa({ ...ka, seoDesc: e.target.value })} rows={3} style={{ ...inputClass(), resize: 'none' } as any} />
                </FormField>
              </div>
            </div>
            <button onClick={save} disabled={saving} style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, width: '100%' }}>
              {saving ? 'Saving…' : (editing.id ? 'Save Changes' : 'Publish Post')}
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
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Blog</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{total} posts</p>
        </div>
        <button onClick={() => { setEditing({ ...EMPTY }); setKa({ ...EMPTY_KA }); setLang('en'); }} style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + New Post
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid #99f6e4', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : posts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#cbd5e1' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✍️</div>
            <p style={{ fontSize: 13 }}>No posts yet — write your first</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Title', 'Author', 'Status', 'Published', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8ecf0', background: '#f8fafc' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const sb = STATUS_BADGE[p.status] || STATUS_BADGE.ARCHIVED;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <p style={{ fontWeight: 600, color: '#1e293b', margin: 0, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', margin: '3px 0 0' }}>/blog/{p.slug}</p>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748b' }}>{p.authorName || '—'}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ ...sb, display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: '#94a3b8' }}>
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setEditing(p); const kaData = p.translations?.ka; setKa(kaData ? { title: kaData.title || '', excerpt: kaData.excerpt || '', content: kaData.content || '', seoTitle: kaData.seoTitle || '', seoDesc: kaData.seoDesc || '' } : { ...EMPTY_KA }); setLang('en'); }} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                        <button onClick={() => deletePost(p.id)} disabled={deleting === p.id} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: deleting === p.id ? 0.5 : 1 }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
