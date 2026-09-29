'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const FAQ_SLUG = 'config-faq-global';

const PAGES = [
  { key: 'home', label: 'Home Page', icon: '🏠' },
  { key: 'pricing', label: 'Pricing Page', icon: '💳' },
  { key: 'how-it-works', label: 'How It Works', icon: '⚙️' },
  { key: 'subscribe', label: 'Subscribe Page', icon: '📬' },
];

type Lang = 'en' | 'ka';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  questionKa: string;
  answerKa: string;
  pages: string[];
  sortOrder: number;
}

const EMPTY: Omit<FAQItem, 'id'> = {
  question: '', answer: '', questionKa: '', answerKa: '', pages: ['home'], sortOrder: 0,
};

function genId() { return Math.random().toString(36).slice(2, 10); }

export default function FAQPage() {
  const [items, setItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<FAQItem | null>(null);
  const [form, setForm] = useState<Omit<FAQItem, 'id'>>(EMPTY);
  const [lang, setLang] = useState<Lang>('en');
  const [filterPage, setFilterPage] = useState<string>('all');

  const token = () => localStorage.getItem('admin_token');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/cms/${FAQ_SLUG}`);
      if (res.ok) {
        const data = await res.json();
        setItems((data.content?.items || []) as FAQItem[]);
      }
    } catch { } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function persist(newItems: FAQItem[]) {
    setSaving(true);
    try {
      await fetch(`${API}/cms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ key: FAQ_SLUG, title: 'FAQ Items', slug: FAQ_SLUG, status: 'PUBLISHED', content: { items: newItems } }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, sortOrder: items.length });
    setLang('en');
  }

  function openEdit(item: FAQItem) {
    setEditing(item);
    setForm({ question: item.question, answer: item.answer, questionKa: item.questionKa || '', answerKa: item.answerKa || '', pages: item.pages || [], sortOrder: item.sortOrder || 0 });
    setLang('en');
  }

  async function saveItem() {
    let next: FAQItem[];
    if (editing) {
      next = items.map(i => i.id === editing.id ? { ...i, ...form } : i);
    } else {
      next = [...items, { id: genId(), ...form }];
    }
    setItems(next);
    setEditing(null);
    await persist(next);
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this FAQ item?')) return;
    const next = items.filter(i => i.id !== id);
    setItems(next);
    await persist(next);
  }

  function togglePage(pageKey: string) {
    setForm(f => ({
      ...f,
      pages: f.pages.includes(pageKey) ? f.pages.filter(p => p !== pageKey) : [...f.pages, pageKey],
    }));
  }

  function moveItem(id: string, dir: -1 | 1) {
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const next = [...items];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setItems(next);
    persist(next);
  }

  const displayed = filterPage === 'all' ? items : items.filter(i => i.pages.includes(filterPage));

  const inp: any = { width: '100%', border: '1px solid var(--slate-200)', borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'var(--white)', boxSizing: 'border-box' };

  const showForm = editing !== null || (editing === null && form.question !== undefined && items.length === 0) || document.activeElement;

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>FAQ Manager</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>
            Manage questions and answers once — assign them to any page. No duplicates needed.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 12, color: 'var(--teal-600)', fontWeight: 600 }}>✓ Saved!</span>}
          <button onClick={openCreate} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ New Question</button>
        </div>
      </div>

      {/* Filter by page */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600 }}>SHOW ON:</span>
        <button onClick={() => setFilterPage('all')} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: filterPage === 'all' ? 'none' : '1px solid var(--slate-200)', background: filterPage === 'all' ? 'var(--slate-900)' : 'var(--white)', color: filterPage === 'all' ? 'var(--white)' : 'var(--slate-500)' }}>
          All ({items.length})
        </button>
        {PAGES.map(p => {
          const count = items.filter(i => i.pages.includes(p.key)).length;
          return (
            <button key={p.key} onClick={() => setFilterPage(p.key)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: filterPage === p.key ? 'none' : '1px solid var(--slate-200)', background: filterPage === p.key ? 'var(--teal-600)' : 'var(--white)', color: filterPage === p.key ? 'var(--white)' : 'var(--slate-500)' }}>
              {p.icon} {p.label} ({count})
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: editing !== null || form.question !== '' ? '1fr 400px' : '1fr', gap: 20, alignItems: 'start' }}>

        {/* FAQ list */}
        <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
              <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', color: 'var(--slate-300)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>❓</div>
              <p style={{ fontSize: 13 }}>{filterPage === 'all' ? 'No FAQ items yet — create one' : 'No items assigned to this page'}</p>
            </div>
          ) : (
            displayed.map((item, idx) => {
              const isEditing = editing?.id === item.id;
              return (
                <div key={item.id} style={{ borderBottom: '1px solid var(--slate-50)', padding: '16px 18px', background: isEditing ? 'var(--teal-50)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Sort controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, marginTop: 2 }}>
                      <button onClick={() => moveItem(item.id, -1)} disabled={idx === 0} style={{ width: 20, height: 20, border: '1px solid var(--slate-200)', borderRadius: 4, background: 'var(--white)', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 10, opacity: idx === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
                      <button onClick={() => moveItem(item.id, 1)} disabled={idx === displayed.length - 1} style={{ width: 20, height: 20, border: '1px solid var(--slate-200)', borderRadius: 4, background: 'var(--white)', cursor: idx === displayed.length - 1 ? 'default' : 'pointer', fontSize: 10, opacity: idx === displayed.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px', fontSize: 14 }}>{item.question}</p>
                      <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '0 0 8px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{item.answer}</p>

                      {/* Page chips */}
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {PAGES.map(p => {
                          const on = item.pages.includes(p.key);
                          return (
                            <span key={p.key} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: on ? 'var(--teal-50)' : 'var(--slate-50)', color: on ? 'var(--teal-600)' : 'var(--slate-300)', border: on ? '1px solid var(--teal-200)' : '1px solid var(--slate-200)' }}>
                              {p.icon} {p.label}
                            </span>
                          );
                        })}
                        {(item.questionKa || item.answerKa) && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' }}>🇬🇪 KA</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openEdit(item)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, background: 'var(--slate-100)', color: 'var(--slate-600)', border: 'none', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => deleteItem(item.id)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Editor panel */}
        {(editing !== null || form.question === '' && !loading) && (
          <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>{editing ? 'Edit Question' : 'New Question'}</h3>
              {editing && <button onClick={() => { setEditing(null); setForm(EMPTY); }} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: 18 }}>×</button>}
            </div>

            {/* Lang tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--slate-200b)' }}>
              {(['en', 'ka'] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', color: lang === l ? 'var(--teal-600)' : 'var(--slate-400)', borderBottom: lang === l ? '2px solid var(--teal-600)' : '2px solid transparent' }}>
                  {l === 'en' ? '🇬🇧 English' : '🇬🇪 Georgian'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {lang === 'en' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Question *</label>
                    <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="When will my first box arrive?" style={inp} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Answer *</label>
                    <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="Your first box ships within 3–5 business days..." rows={4} style={{ ...inp, resize: 'vertical' }} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Question (Georgian)</label>
                    <input value={form.questionKa} onChange={e => setForm(f => ({ ...f, questionKa: e.target.value }))} placeholder="Georgian translation..." style={inp} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Answer (Georgian)</label>
                    <textarea value={form.answerKa} onChange={e => setForm(f => ({ ...f, answerKa: e.target.value }))} placeholder="Georgian translation..." rows={4} style={{ ...inp, resize: 'vertical' }} />
                  </div>
                </>
              )}

              {/* Page assignment */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Show on pages</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {PAGES.map(p => (
                    <label key={p.key} onClick={() => togglePage(p.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: form.pages.includes(p.key) ? '1px solid var(--teal-600)' : '1px solid var(--slate-200)', background: form.pages.includes(p.key) ? 'var(--teal-50)' : 'var(--white)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: form.pages.includes(p.key) ? 'none' : '2px solid var(--slate-200)', background: form.pages.includes(p.key) ? 'var(--teal-600)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {form.pages.includes(p.key) && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="var(--white)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-800)' }}>{p.icon} {p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button onClick={saveItem} disabled={saving || !form.question.trim()} style={{ flex: 1, background: !form.question.trim() ? 'var(--slate-200)' : 'var(--teal-600)', color: !form.question.trim() ? 'var(--slate-400)' : 'var(--white)', border: 'none', borderRadius: 9, padding: '9px', fontSize: 13, fontWeight: 700, cursor: saving || !form.question.trim() ? 'default' : 'pointer' }}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add question'}
                </button>
                <button onClick={() => { setEditing(null); setForm(EMPTY); }} style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', border: 'none', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create first */}
      {!loading && items.length === 0 && editing === null && (
        <div style={{ marginTop: 20, background: 'var(--teal-50)', border: '1px dashed var(--teal-200)', borderRadius: 12, padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--teal-600)', fontWeight: 600, marginBottom: 8 }}>No FAQ items yet</p>
          <p style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 16 }}>Create your first question — it will be reusable across all pages.</p>
          <button onClick={openCreate} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 9, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Create first question</button>
        </div>
      )}
    </div>
  );
}
