'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
type Lang = 'en' | 'ka';

// ── Page definitions ──────────────────────────────────────────────────────────

const PAGE_DEFS: Record<string, { label: string; icon: string; previewPath?: string; sections: SectionDef[] }> = {
  homepage: {
    label: 'Home Page', icon: '🏠', previewPath: '/',
    sections: [
      {
        id: 'hero', label: 'Hero Section', icon: '🌟',
        fields: [
          { key: 'badge', label: 'Badge text', type: 'text', placeholder: 'Monthly Dog Subscription Boxes · Georgia' },
          { key: 'heading', label: 'Main heading', type: 'text', placeholder: 'Your dog deserves a surprise every month' },
          { key: 'headingAccent', label: 'Highlighted part of heading', type: 'text', placeholder: 'a surprise every month' },
          { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Curated boxes of premium treats...' },
          { key: 'imageUrl', label: 'Hero image URL', type: 'image', placeholder: 'https://...' },
          { key: 'cta1Text', label: 'Primary button text', type: 'text', placeholder: 'Start Your Subscription' },
          { key: 'cta1Href', label: 'Primary button link', type: 'text', placeholder: '/prices' },
          { key: 'cta2Text', label: 'Gift button text', type: 'text', placeholder: '🎁 Give as a Gift' },
          { key: 'cta2Href', label: 'Gift button link', type: 'text', placeholder: '/prices?gift=true' },
        ],
        translatableKeys: ['badge', 'heading', 'headingAccent', 'description', 'cta1Text', 'cta2Text'],
      },
      {
        id: 'stats', label: 'Stats Bar', icon: '📊',
        fields: [
          { key: 'stat1Value', label: 'Stat 1 value', type: 'text', placeholder: '500+' },
          { key: 'stat1Label', label: 'Stat 1 label', type: 'text', placeholder: 'Happy dogs' },
          { key: 'stat2Value', label: 'Stat 2 value', type: 'text', placeholder: '4.9★' },
          { key: 'stat2Label', label: 'Stat 2 label', type: 'text', placeholder: 'Average rating' },
          { key: 'stat3Value', label: 'Stat 3 value', type: 'text', placeholder: '5–8' },
          { key: 'stat3Label', label: 'Stat 3 label', type: 'text', placeholder: 'Products per box' },
        ],
        translatableKeys: ['stat1Label', 'stat2Label', 'stat3Label'],
      },
      {
        id: 'whatsInBox', label: "What's in the Box", icon: '📦',
        fields: [
          { key: 'heading', label: 'Section heading', type: 'text', placeholder: "What's inside every box?" },
          { key: 'description', label: 'Section description', type: 'textarea', placeholder: 'Every box is handpicked...' },
          { key: 'items', label: 'Box content items', type: 'jsonArray', itemFields: [
            { key: 'emoji', label: 'Emoji', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'desc', label: 'Description', type: 'textarea' },
            { key: 'bg', label: 'Background color class', type: 'text', placeholder: 'bg-teal-50' },
          ]},
        ],
        translatableKeys: ['heading', 'description'],
      },
      {
        id: 'howItWorks', label: 'How It Works', icon: '⚙️',
        fields: [
          { key: 'heading', label: 'Section heading', type: 'text', placeholder: 'How Pupbox works' },
          { key: 'description', label: 'Section description', type: 'text', placeholder: 'Get started in minutes...' },
          { key: 'steps', label: 'Steps', type: 'jsonArray', itemFields: [
            { key: 'step', label: 'Step number', type: 'text' },
            { key: 'icon', label: 'Emoji', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'desc', label: 'Description', type: 'textarea' },
          ]},
        ],
        translatableKeys: ['heading', 'description'],
      },
      {
        id: 'plans', label: 'Pricing Plans', icon: '💰',
        fields: [
          { key: 'heading', label: 'Section heading', type: 'text', placeholder: 'Simple, transparent pricing' },
          { key: 'description', label: 'Section description', type: 'text', placeholder: 'Longer plans save more...' },
          { key: 'note', label: '⚠️ Plans are pulled from Subscription Plans. To control which plans appear, use the "Show on Home" toggle on each plan card.', type: 'info' },
        ],
        translatableKeys: ['heading', 'description'],
      },
      {
        id: 'testimonials', label: 'Testimonials', icon: '⭐',
        fields: [
          { key: 'heading', label: 'Section heading', type: 'text', placeholder: 'Dogs (and owners) love Pupbox' },
          { key: 'description', label: 'Section description', type: 'text', placeholder: 'Join hundreds of happy Pupbox families...' },
          { key: 'items', label: 'Testimonials', type: 'jsonArray', itemFields: [
            { key: 'name', label: 'Customer name', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'dog', label: 'Dog breed', type: 'text' },
            { key: 'quote', label: 'Quote', type: 'textarea' },
            { key: 'dogImg', label: 'Image URL', type: 'image' },
          ]},
        ],
        translatableKeys: ['heading', 'description'],
      },
      {
        id: 'faq', label: 'FAQ Section', icon: '❓',
        fields: [
          { key: 'heading', label: 'Section heading', type: 'text', placeholder: 'Frequently asked questions' },
          { key: 'note', label: '⚠️ FAQ items are managed in the FAQ Manager page. Tick "Show on Home" there.', type: 'info' },
        ],
        translatableKeys: ['heading'],
      },
      {
        id: 'cta', label: 'Call to Action', icon: '🎯',
        fields: [
          { key: 'heading', label: 'Heading', type: 'text', placeholder: "Make your dog's month, every month." },
          { key: 'headingAccent', label: 'Accented part', type: 'text', placeholder: 'every month.' },
          { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Join hundreds of Georgian dog owners...' },
          { key: 'buttonText', label: 'Button text', type: 'text', placeholder: 'Start Your Subscription' },
          { key: 'buttonHref', label: 'Button link', type: 'text', placeholder: '/prices' },
        ],
        translatableKeys: ['heading', 'headingAccent', 'description', 'buttonText'],
      },
    ],
  },
  pricing: {
    label: 'Pricing Page', icon: '💳', previewPath: '/prices',
    sections: [
      {
        id: 'hero', label: 'Page Header', icon: '🏷️',
        fields: [
          { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Choose your Pupbox plan' },
          { key: 'description', label: 'Description', type: 'textarea', placeholder: 'All plans include...' },
        ],
        translatableKeys: ['heading', 'description'],
      },
      {
        id: 'guarantee', label: 'Guarantee Bar', icon: '✅',
        fields: [
          { key: 'item1', label: 'Item 1', type: 'text', placeholder: '🚚 Free delivery' },
          { key: 'item2', label: 'Item 2', type: 'text', placeholder: '🔄 Cancel anytime' },
          { key: 'item3', label: 'Item 3', type: 'text', placeholder: '🎁 Personalised' },
          { key: 'item4', label: 'Item 4', type: 'text', placeholder: '⭐ 4.9 rating' },
        ],
        translatableKeys: ['item1', 'item2', 'item3', 'item4'],
      },
      {
        id: 'faq', label: 'FAQ Section', icon: '❓',
        fields: [
          { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Got questions?' },
          { key: 'note', label: '⚠️ FAQ items are managed in the FAQ Manager. Tick "Show on Pricing" there.', type: 'info' },
        ],
        translatableKeys: ['heading'],
      },
    ],
  },
  'how-it-works': {
    label: 'How It Works', icon: '⚙️', previewPath: '/how-it-works',
    sections: [
      {
        id: 'hero', label: 'Page Header', icon: '🌟',
        fields: [
          { key: 'heading', label: 'Heading', type: 'text', placeholder: 'How Pupbox Works' },
          { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Get started in minutes...' },
        ],
        translatableKeys: ['heading', 'description'],
      },
      {
        id: 'steps', label: 'Steps Section', icon: '👣',
        fields: [
          { key: 'heading', label: 'Section heading', type: 'text', placeholder: 'Four easy steps' },
          { key: 'steps', label: 'Steps', type: 'jsonArray', itemFields: [
            { key: 'step', label: 'Step number', type: 'text' },
            { key: 'icon', label: 'Emoji', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'desc', label: 'Description', type: 'textarea' },
          ]},
        ],
        translatableKeys: ['heading'],
      },
      {
        id: 'faq', label: 'FAQ Section', icon: '❓',
        fields: [
          { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Questions?' },
          { key: 'note', label: '⚠️ FAQ items are managed in the FAQ Manager. Tick "Show on How It Works" there.', type: 'info' },
        ],
        translatableKeys: ['heading'],
      },
    ],
  },
  blog: {
    label: 'Blog', icon: '✍️', previewPath: '/blog',
    sections: [
      {
        id: 'hero', label: 'Blog Header', icon: '📰',
        fields: [
          { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Pupbox Blog' },
          { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Tips, news and stories for dog lovers in Georgia.' },
        ],
        translatableKeys: ['heading', 'description'],
      },
      {
        id: 'seo', label: 'SEO & Meta', icon: '🔍',
        fields: [
          { key: 'metaTitle', label: 'Meta title', type: 'text', placeholder: 'Pupbox Blog — Dog Tips & Stories' },
          { key: 'metaDescription', label: 'Meta description', type: 'textarea', placeholder: 'Read the latest tips, news and stories...' },
        ],
        translatableKeys: ['metaTitle', 'metaDescription'],
      },
    ],
  },
  terms: {
    label: 'Terms & Conditions', icon: '📋', previewPath: '/terms',
    sections: [
      {
        id: 'hero', label: 'Page Header', icon: '📋',
        fields: [
          { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Terms & Conditions' },
          { key: 'lastUpdated', label: 'Last updated date', type: 'text', placeholder: '1 January 2025' },
        ],
        translatableKeys: ['heading'],
      },
      {
        id: 'content', label: 'Page Content', icon: '📄',
        fields: [
          { key: 'body', label: 'Terms content (plain text or HTML)', type: 'textarea', placeholder: '1. Introduction\n\nWelcome to Pupbox...' },
        ],
        translatableKeys: ['body'],
      },
    ],
  },
  privacy: {
    label: 'Privacy Policy', icon: '🔒', previewPath: '/privacy',
    sections: [
      {
        id: 'hero', label: 'Page Header', icon: '🔒',
        fields: [
          { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Privacy Policy' },
          { key: 'lastUpdated', label: 'Last updated date', type: 'text', placeholder: '1 January 2025' },
        ],
        translatableKeys: ['heading'],
      },
      {
        id: 'content', label: 'Page Content', icon: '📄',
        fields: [
          { key: 'body', label: 'Privacy policy content (plain text or HTML)', type: 'textarea', placeholder: '1. Data we collect\n\nWe collect...' },
        ],
        translatableKeys: ['body'],
      },
    ],
  },
  contact: {
    label: 'Contact', icon: '📬', previewPath: '/contact',
    sections: [
      {
        id: 'hero', label: 'Page Header', icon: '📬',
        fields: [
          { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Get in touch' },
          { key: 'description', label: 'Description', type: 'textarea', placeholder: "We'd love to hear from you." },
        ],
        translatableKeys: ['heading', 'description'],
      },
      {
        id: 'info', label: 'Contact Details', icon: '📞',
        fields: [
          { key: 'email', label: 'Email address', type: 'text', placeholder: 'hello@pupbox.ge' },
          { key: 'phone', label: 'Phone number', type: 'text', placeholder: '+995 xxx xxx xxx' },
          { key: 'address', label: 'Office address', type: 'textarea', placeholder: 'Tbilisi, Georgia' },
          { key: 'workingHours', label: 'Working hours', type: 'text', placeholder: 'Mon–Fri, 10:00–18:00' },
          { key: 'mapEmbedUrl', label: 'Google Maps embed URL', type: 'text', placeholder: 'https://maps.google.com/...' },
        ],
        translatableKeys: ['address', 'workingHours'],
      },
      {
        id: 'social', label: 'Social Links', icon: '🔗',
        fields: [
          { key: 'instagram', label: 'Instagram URL', type: 'text', placeholder: 'https://instagram.com/pupbox.ge' },
          { key: 'facebook', label: 'Facebook URL', type: 'text', placeholder: 'https://facebook.com/pupboxge' },
          { key: 'tiktok', label: 'TikTok URL', type: 'text', placeholder: 'https://tiktok.com/@pupbox' },
        ],
        translatableKeys: [],
      },
    ],
  },
};

interface SectionDef {
  id: string;
  label: string;
  icon: string;
  fields: FieldDef[];
  translatableKeys: string[];
}
interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'jsonArray' | 'info';
  placeholder?: string;
  itemFields?: FieldDef[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNestedVal(data: any, lang: Lang, key: string) {
  if (lang === 'en') return data?.en?.[key] ?? data?.[key] ?? '';
  return data?.ka?.[key] ?? '';
}

function setNestedVal(data: any, lang: Lang, key: string, value: string) {
  const next = { ...data };
  if (lang === 'en') next.en = { ...(next.en || {}), [key]: value };
  else next.ka = { ...(next.ka || {}), [key]: value };
  return next;
}

// ── Section Editor ────────────────────────────────────────────────────────────

function SectionEditor({ sectionDef, data, onChange }: { sectionDef: SectionDef; data: any; onChange: (d: any) => void }) {
  const [lang, setLang] = useState<Lang>('en');
  const inp: any = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' };

  function val(key: string) { return getNestedVal(data, lang, key); }
  function set(key: string, value: string) { onChange(setNestedVal(data, lang, key, value)); }

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #e8ecf0' }}>
        {(['en', 'ka'] as Lang[]).map(l => (
          <button key={l} onClick={() => setLang(l)} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', color: lang === l ? '#0d9488' : '#94a3b8', borderBottom: lang === l ? '2px solid #0d9488' : '2px solid transparent' }}>
            {l === 'en' ? '🇬🇧 English' : '🇬🇪 Georgian'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sectionDef.fields.map(field => {
          if (field.type === 'info') {
            return (
              <div key={field.key} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#92400e' }}>
                {field.label}
              </div>
            );
          }

          const isTranslatable = sectionDef.translatableKeys.includes(field.key);
          if (!isTranslatable && lang === 'ka') return null;

          if (field.type === 'jsonArray') {
            const items: any[] = (lang === 'en' ? data?.en?.[field.key] : data?.ka?.[field.key]) || data?.[field.key] || [];
            const setItems = (newItems: any[]) => {
              const next = { ...data };
              if (lang === 'en') next.en = { ...(next.en || {}), [field.key]: newItems };
              else next.ka = { ...(next.ka || {}), [field.key]: newItems };
              onChange(next);
            };
            return (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{field.label}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e8ecf0', padding: '12px 14px', position: 'relative' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {(field.itemFields || []).map(sf => (
                          <div key={sf.key} style={{ gridColumn: sf.type === 'textarea' ? '1 / -1' : 'auto' }}>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{sf.label}</label>
                            {sf.type === 'textarea'
                              ? <textarea value={item[sf.key] || ''} onChange={e => { const ni = [...items]; ni[idx] = { ...ni[idx], [sf.key]: e.target.value }; setItems(ni); }} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={sf.placeholder} />
                              : <input value={item[sf.key] || ''} onChange={e => { const ni = [...items]; ni[idx] = { ...ni[idx], [sf.key]: e.target.value }; setItems(ni); }} style={inp} placeholder={sf.placeholder} />}
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: 8, right: 10, background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => { const ni: any = {}; (field.itemFields || []).forEach(sf => ni[sf.key] = ''); setItems([...items, ni]); }} style={{ background: '#f0fdfa', color: '#0d9488', border: '1px dashed #99f6e4', borderRadius: 9, padding: '8px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    + Add item
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={field.key}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                {field.label}
                {isTranslatable && <span style={{ fontSize: 10, color: '#0d9488', marginLeft: 6 }}>({lang.toUpperCase()})</span>}
              </label>
              {field.type === 'image' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input value={val(field.key)} onChange={e => set(field.key, e.target.value)} style={inp} placeholder={field.placeholder || 'https://...'} />
                  {val(field.key) && <img src={val(field.key)} alt="preview" style={{ height: 80, width: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} onError={e => (e.currentTarget.style.display = 'none')} />}
                  <p style={{ fontSize: 11, color: '#94a3b8' }}>Paste an image URL. Use external hosting (Cloudinary, Unsplash, etc.)</p>
                </div>
              ) : field.type === 'textarea' ? (
                <textarea value={val(field.key)} onChange={e => set(field.key, e.target.value)} placeholder={field.placeholder} rows={3} style={{ ...inp, resize: 'vertical' }} />
              ) : (
                <input value={val(field.key)} onChange={e => set(field.key, e.target.value)} placeholder={field.placeholder} style={inp} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page Editor ───────────────────────────────────────────────────────────────

export default function PageEditorPage() {
  const params = useParams<{ pageKey: string }>();
  const pageKey = params?.pageKey || 'homepage';

  const [pageData, setPageData] = useState<Record<string, any>>({});
  const [sectionEnabled, setSectionEnabled] = useState<Record<string, boolean>>({});
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const pageDef = PAGE_DEFS[pageKey];
  const slug = `config-${pageKey}`;
  const token = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';

  const load = useCallback(async () => {
    setLoading(true);
    setExpandedSection(null);
    try {
      const res = await fetch(`${API}/cms/${slug}`);
      if (res.ok) {
        const page = await res.json();
        const content = page.content || {};
        setPageData(content.sections || {});
        setSectionEnabled(content.enabled || {});
      } else {
        setPageData({});
        setSectionEnabled({});
      }
    } catch {
      setPageData({});
      setSectionEnabled({});
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      await fetch(`${API}/cms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ key: slug, title: pageDef?.label, slug, status: 'PUBLISHED', content: { sections: pageData, enabled: sectionEnabled } }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  function toggleSection(id: string) {
    setSectionEnabled(e => ({ ...e, [id]: e[id] === false ? true : false }));
  }

  function isSectionEnabled(id: string) {
    return sectionEnabled[id] !== false;
  }

  if (!pageDef) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12, fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 40 }}>🤔</div>
        <p style={{ color: '#64748b', fontSize: 15 }}>Page not found: <strong>{pageKey}</strong></p>
      </div>
    );
  }

  const previewUrl = `http://localhost:3000${pageDef.previewPath || '/'}`;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8ecf0', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{pageDef.icon} {pageDef.label}</h1>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>Edit sections, toggle visibility, and translate content to Georgian.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 12, color: '#0d9488', fontWeight: 600 }}>✓ Saved!</span>}
          <a href={previewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px', textDecoration: 'none' }}>Preview ↗</a>
          <button onClick={save} disabled={saving} style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : '💾 Save page'}
          </button>
        </div>
      </div>

      {/* Sections */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ width: 32, height: 32, border: '4px solid #99f6e4', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ padding: 28, maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pageDef.sections.map(section => {
            const enabled = isSectionEnabled(section.id);
            const expanded = expandedSection === section.id;
            const sectionData = pageData[section.id] || {};

            return (
              <div key={section.id} style={{ background: '#fff', borderRadius: 14, border: enabled ? '1px solid #e8ecf0' : '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', opacity: enabled ? 1 : 0.65, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }} onClick={() => setExpandedSection(expanded ? null : section.id)}>
                  <div style={{ color: '#d1d5db', fontSize: 14, cursor: 'grab' }}>⠿</div>
                  <div
                    onClick={e => { e.stopPropagation(); toggleSection(section.id); }}
                    style={{ width: 40, height: 22, borderRadius: 11, background: enabled ? '#0d9488' : '#e2e8f0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                  >
                    <span style={{ position: 'absolute', top: 3, left: enabled ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  <span style={{ fontSize: 18 }}>{section.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: 14 }}>{section.label}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                      {enabled ? 'Visible on website' : 'Hidden — toggle to show'} · {section.fields.filter(f => f.type !== 'info').length} field{section.fields.filter(f => f.type !== 'info').length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#94a3b8' }}>
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {expanded && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '20px 20px 24px' }}>
                    <SectionEditor sectionDef={section} data={sectionData} onChange={newData => setPageData(pd => ({ ...pd, [section.id]: newData }))} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
