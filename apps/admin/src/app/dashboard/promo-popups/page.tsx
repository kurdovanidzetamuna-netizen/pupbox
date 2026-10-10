'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SLUG = 'config-promo-popups';

const TRIGGER_OPTIONS = [
  { value: 'on_load',      label: 'On page load' },
  { value: 'exit_intent',  label: 'Exit intent (mouse leaves)' },
  { value: 'after_delay',  label: 'After delay' },
  { value: 'on_scroll',    label: 'After 50% scroll' },
];

const PAGE_OPTIONS = [
  { value: 'all',         label: 'All pages' },
  { value: 'homepage',    label: 'Home page' },
  { value: 'prices',      label: 'Pricing page' },
  { value: 'how-it-works',label: 'How it works' },
  { value: 'blog',        label: 'Blog' },
  { value: 'checkout',    label: 'Checkout' },
];

const TYPE_OPTIONS = [
  { value: 'discount',    label: '🏷️  Discount / Coupon' },
  { value: 'newsletter',  label: '📧  Newsletter signup' },
  { value: 'announcement',label: '📣  Announcement' },
  { value: 'exit',        label: '🚪  Exit offer' },
];

interface Popup {
  id: string;
  active: boolean;
  type: string;
  titleEn: string;
  titleKa: string;
  bodyEn: string;
  bodyKa: string;
  ctaTextEn: string;
  ctaTextKa: string;
  ctaUrl: string;
  couponCode: string;
  imageUrl: string;
  trigger: string;
  delaySeconds: number;
  showOnPages: string[];
  showOncePerSession: boolean;
  showOncePerDay: boolean;
  bgColor: string;
  accentColor: string;
}

function genId() { return Math.random().toString(36).slice(2, 10); }

const EMPTY: Omit<Popup, 'id'> = {
  active: true,
  type: 'discount',
  titleEn: '',
  titleKa: '',
  bodyEn: '',
  bodyKa: '',
  ctaTextEn: 'Get the deal →',
  ctaTextKa: 'გარიგების მიღება →',
  ctaUrl: '/prices',
  couponCode: '',
  imageUrl: '',
  trigger: 'after_delay',
  delaySeconds: 5,
  showOnPages: ['all'],
  showOncePerSession: true,
  showOncePerDay: false,
  bgColor: 'var(--white)',
  accentColor: 'var(--teal-600)',
};

export default function PromoPopupsPage() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<Popup | null>(null);
  const [form, setForm] = useState<Omit<Popup, 'id'>>(EMPTY);
  const [lang, setLang] = useState<'en' | 'ka'>('en');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const token = () => localStorage.getItem('admin_token');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/cms/admin/${SLUG}`, { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } });
      if (res.ok) {
        const data = await res.json();
        setPopups((data.content?.popups || []) as Popup[]);
      }
    } catch { } finally {
      setLoading(false);
    }
  }

  async function saveAll(next: Popup[]) {
    setSaving(true);
    try {
      await fetch(`${API}/cms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ slug: SLUG, content: { popups: next } }),
      });
      setPopups(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch { } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setEditing(null); setForm(EMPTY); setDeleteConfirm(null); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
  }

  function openEdit(p: Popup) {
    setEditing(p);
    setForm({ ...p });
  }

  function handleSave() {
    if (!form.titleEn.trim()) return;
    let next: Popup[];
    if (editing) {
      next = popups.map(p => p.id === editing.id ? { ...form, id: editing.id } : p);
    } else {
      next = [...popups, { ...form, id: genId() }];
    }
    saveAll(next);
    setEditing(null);
    setForm(EMPTY);
  }

  function handleDelete(id: string) {
    saveAll(popups.filter(p => p.id !== id));
    setDeleteConfirm(null);
    if (editing?.id === id) { setEditing(null); setForm(EMPTY); }
  }

  function toggleActive(id: string) {
    saveAll(popups.map(p => p.id === id ? { ...p, active: !p.active } : p));
  }

  function f(key: keyof Omit<Popup, 'id'>) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }));
    };
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Promo Popups</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>Manage website popups — discounts, announcements, exit offers</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 12, color: 'var(--teal-600)', fontWeight: 600 }}>✓ Saved</span>}
          <button
            onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'var(--slate-900)', color: 'var(--white)', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + New Popup
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24, alignItems: 'start' }}>
        {/* Popup list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--slate-200b)', padding: '60px 0', textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>Loading…</div>
          ) : popups.length === 0 ? (
            <div style={{ background: 'var(--white)', borderRadius: 14, border: '2px dashed var(--slate-200b)', padding: '60px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
              <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>No popups yet. Create your first one.</p>
            </div>
          ) : (
            popups.map(p => (
              <div
                key={p.id}
                style={{ background: 'var(--white)', borderRadius: 14, border: `1px solid ${editing?.id === p.id ? 'var(--teal-600)' : 'var(--slate-200b)'}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onClick={() => openEdit(p)}
              >
                {/* Type badge */}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--teal-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {TYPE_OPTIONS.find(t => t.value === p.type)?.label.split(' ')[0] || '🎉'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--slate-900)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.titleEn || <span style={{ color: 'var(--slate-300)' }}>Untitled</span>}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--slate-400)' }}>
                    {TRIGGER_OPTIONS.find(t => t.value === p.trigger)?.label} · {PAGE_OPTIONS.find(pg => pg.value === (p.showOnPages?.[0] || 'all'))?.label}
                    {p.couponCode && <span style={{ marginLeft: 6, background: 'var(--yellow-100)', color: 'var(--yellow-800)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{p.couponCode}</span>}
                  </p>
                </div>

                {/* Active toggle */}
                <div
                  onClick={e => { e.stopPropagation(); toggleActive(p.id); }}
                  style={{ width: 36, height: 20, borderRadius: 999, background: p.active ? 'var(--teal-600)' : 'var(--slate-200)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
                >
                  <div style={{ position: 'absolute', top: 2, left: p.active ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--white)', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>

                {/* Delete */}
                <button
                  onClick={e => { e.stopPropagation(); setDeleteConfirm(p.id); }}
                  style={{ background: 'none', border: 'none', color: 'var(--slate-300)', cursor: 'pointer', fontSize: 16, padding: '4px 6px', borderRadius: 6, flexShrink: 0 }}
                  title="Delete"
                >✕</button>
              </div>
            ))
          )}
        </div>

        {/* Editor panel */}
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--slate-200b)', overflow: 'hidden', position: 'sticky', top: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--slate-900)' }}>{editing ? 'Edit Popup' : 'New Popup'}</h3>
            {/* Lang toggle */}
            <div style={{ display: 'flex', background: 'var(--slate-100)', borderRadius: 8, padding: 2 }}>
              {(['en', 'ka'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: lang === l ? 'var(--white)' : 'transparent', color: lang === l ? 'var(--slate-900)' : 'var(--slate-400)', boxShadow: lang === l ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
            {/* Type */}
            <Field label="Type">
              <select value={form.type} onChange={f('type')} style={selectStyle}>
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>

            {/* Title */}
            <Field label={`Title (${lang.toUpperCase()})`}>
              <input value={lang === 'en' ? form.titleEn : form.titleKa} onChange={e => setForm(p => ({ ...p, [lang === 'en' ? 'titleEn' : 'titleKa']: e.target.value }))} style={inputStyle} placeholder="e.g. Get 10% off your first box" />
            </Field>

            {/* Body */}
            <Field label={`Message (${lang.toUpperCase()})`}>
              <textarea value={lang === 'en' ? form.bodyEn : form.bodyKa} onChange={e => setForm(p => ({ ...p, [lang === 'en' ? 'bodyEn' : 'bodyKa']: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Short description shown under the title" />
            </Field>

            {/* CTA */}
            <Field label={`Button text (${lang.toUpperCase()})`}>
              <input value={lang === 'en' ? form.ctaTextEn : form.ctaTextKa} onChange={e => setForm(p => ({ ...p, [lang === 'en' ? 'ctaTextEn' : 'ctaTextKa']: e.target.value }))} style={inputStyle} placeholder="Get the deal →" />
            </Field>

            <Field label="Button URL">
              <input value={form.ctaUrl} onChange={f('ctaUrl')} style={inputStyle} placeholder="/prices" />
            </Field>

            {/* Coupon */}
            <Field label="Coupon code (optional)">
              <input value={form.couponCode} onChange={f('couponCode')} style={inputStyle} placeholder="WELCOME10" />
            </Field>

            {/* Image */}
            <Field label="Image URL (optional)">
              <input value={form.imageUrl} onChange={f('imageUrl')} style={inputStyle} placeholder="https://…" />
            </Field>

            {/* Trigger */}
            <Field label="Show trigger">
              <select value={form.trigger} onChange={f('trigger')} style={selectStyle}>
                {TRIGGER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>

            {form.trigger === 'after_delay' && (
              <Field label="Delay (seconds)">
                <input type="number" min={1} max={60} value={form.delaySeconds} onChange={e => setForm(p => ({ ...p, delaySeconds: +e.target.value }))} style={inputStyle} />
              </Field>
            )}

            {/* Pages */}
            <Field label="Show on pages">
              <select value={form.showOnPages?.[0] || 'all'} onChange={e => setForm(p => ({ ...p, showOnPages: [e.target.value] }))} style={selectStyle}>
                {PAGE_OPTIONS.map(pg => <option key={pg.value} value={pg.value}>{pg.label}</option>)}
              </select>
            </Field>

            {/* Frequency */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={labelStyle}>Frequency</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate-600)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.showOncePerSession} onChange={e => setForm(p => ({ ...p, showOncePerSession: e.target.checked }))} />
                Show once per session
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate-600)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.showOncePerDay} onChange={e => setForm(p => ({ ...p, showOncePerDay: e.target.checked }))} />
                Show once per day
              </label>
            </div>

            {/* Colors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Background">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="color" value={form.bgColor} onChange={e => setForm(p => ({ ...p, bgColor: e.target.value }))} style={{ width: 32, height: 32, border: '1px solid var(--slate-200)', borderRadius: 6, padding: 2, cursor: 'pointer' }} />
                  <input value={form.bgColor} onChange={f('bgColor')} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </Field>
              <Field label="Accent">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="color" value={form.accentColor} onChange={e => setForm(p => ({ ...p, accentColor: e.target.value }))} style={{ width: 32, height: 32, border: '1px solid var(--slate-200)', borderRadius: 6, padding: 2, cursor: 'pointer' }} />
                  <input value={form.accentColor} onChange={f('accentColor')} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </Field>
            </div>

            {/* Preview */}
            {(form.titleEn || form.titleKa) && (
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--slate-200b)' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', padding: '8px 12px', background: 'var(--slate-50)', letterSpacing: '0.06em' }}>Preview</p>
                <div style={{ background: form.bgColor, padding: '16px', textAlign: 'center' }}>
                  {form.imageUrl && <img src={form.imageUrl} alt="" style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />}
                  <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 15, color: 'var(--slate-900)' }}>{lang === 'en' ? form.titleEn : form.titleKa}</p>
                  {(lang === 'en' ? form.bodyEn : form.bodyKa) && <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--slate-500)' }}>{lang === 'en' ? form.bodyEn : form.bodyKa}</p>}
                  {form.couponCode && <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 16, color: form.accentColor, letterSpacing: '0.1em' }}>{form.couponCode}</p>}
                  {(lang === 'en' ? form.ctaTextEn : form.ctaTextKa) && (
                    <div style={{ display: 'inline-block', background: form.accentColor, color: 'var(--white)', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700 }}>
                      {lang === 'en' ? form.ctaTextEn : form.ctaTextKa}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--slate-100)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {editing && (
              <button onClick={() => { setEditing(null); setForm(EMPTY); }} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-500)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Discard
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !form.titleEn.trim()}
              style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: form.titleEn.trim() ? 'var(--teal-600)' : 'var(--slate-200)', color: form.titleEn.trim() ? 'var(--white)' : 'var(--slate-400)', fontSize: 13, fontWeight: 600, cursor: form.titleEn.trim() ? 'pointer' : 'not-allowed' }}
            >
              {saving ? 'Saving…' : editing ? 'Update' : 'Add Popup'}
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setDeleteConfirm(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'relative', background: 'var(--white)', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--slate-900)' }}>Delete popup?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.6 }}>This popup will be removed from the website. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-500)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: 'var(--red-600)', color: 'var(--white)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em' };
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--slate-900)', outline: 'none', boxSizing: 'border-box' };
const selectStyle: React.CSSProperties = { ...inputStyle, background: 'var(--white)', cursor: 'pointer' };
