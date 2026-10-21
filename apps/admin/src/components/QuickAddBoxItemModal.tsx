'use client';
import { Select } from '@/components/Dropdown';
import { categoryOptions } from '@/components/categoryOptions';
import { useState, useEffect, useRef } from 'react';
import LangTabs, { type Lang } from '@/components/LangTabs';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
const MAX_SIZE = 10 * 1024 * 1024;

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const DisabledBadge = () => (
  <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--slate-100)', color: 'var(--slate-400)', border: '1px solid var(--slate-200)', borderRadius: 5, padding: '1px 6px', marginLeft: 6 }}>EN only</span>
);

interface Props {
  onClose: () => void;
  onCreated?: () => void;
}

export default function QuickAddBoxItemModal({ onClose, onCreated }: Props) {
  const [lang, setLang] = useState<Lang>('en');
  const isKa = lang === 'ka';
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', sku: '', price: '', categoryId: '', stockQuantity: '0', brand: '', shortDescription: '' });
  const [ka, setKa] = useState({ name: '', shortDescription: '' });
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [queuedPreviews, setQueuedPreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [visible, setVisible] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const token = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    fetch(`${API}/admin/categories`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setCategories((d.items || d || []).sort((a: any, b: any) => a.name.localeCompare(b.name))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  function set(key: string, value: string) {
    setForm(f => {
      if (key === 'name' && !slugManual) setSlug(slugify(value));
      return { ...f, [key]: value };
    });
    setErrors(e => ({ ...e, [key]: '' }));
  }

  function setKaField(key: string, value: string) {
    setKa(k => ({ ...k, [key]: value }));
    setErrors(e => ({ ...e, [`ka_${key}`]: '' }));
  }

  function queueFiles(files: FileList | File[]) {
    setImageError('');
    const arr = Array.from(files);
    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const file of arr) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.includes(ext)) { rejected.push(`"${file.name}" — unsupported format`); continue; }
      if (file.size > MAX_SIZE) { rejected.push(`"${file.name}" — exceeds 10 MB`); continue; }
      accepted.push(file);
    }
    if (rejected.length) setImageError(rejected.join('; '));
    accepted.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setQueuedFiles(q => [...q, file]);
        setQueuedPreviews(p => [...p, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.sku.trim()) errs.sku = 'SKU is required';
    if (!slug.trim()) errs.slug = 'Slug is required';
    if (!form.price || Number(form.price) <= 0) errs.price = 'Price must be > 0';
    if (!ka.name.trim()) errs.ka_name = 'Georgian name is required';
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Switch to the tab that has the first error
      if (errs.ka_name && !errs.name && !errs.sku && !errs.slug && !errs.price) setLang('ka');
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        name: form.name.trim(), slug: slug.trim(), sku: form.sku.trim(),
        price: Number(form.price), includedInBox: true, standaloneSale: false,
        stockQuantity: Number(form.stockQuantity) || 0,
        translations: { ka: { name: ka.name.trim(), shortDescription: ka.shortDescription || undefined } },
      };
      if (form.brand) body.brand = form.brand;
      if (form.shortDescription) body.shortDescription = form.shortDescription;
      if (form.categoryId) body.categoryId = form.categoryId;

      const res = await fetch(`${API}/admin/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message);

      for (const file of queuedFiles) {
        const fd = new FormData();
        fd.append('file', file);
        const upRes = await fetch(`${API}/admin/upload/image`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd });
        if (upRes.ok) {
          const { url } = await upRes.json();
          await fetch(`${API}/admin/products/${data.id}/images`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, alt: form.name }),
          });
        }
      }

      setToast(`"${form.name}" created!`);
      setTimeout(() => { onCreated?.(); handleClose(); }, 900);
    } catch (err: any) {
      setErrors({ _: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  const inp = (error?: string, disabled?: boolean): React.CSSProperties => ({
    width: '100%', padding: '8px 11px', fontSize: 13,
    border: `1px solid ${error ? 'var(--red-300)' : 'var(--slate-200)'}`,
    borderRadius: 9, outline: 'none',
    background: disabled ? 'var(--slate-50)' : error ? 'var(--red-50b)' : 'var(--white)',
    boxSizing: 'border-box', color: disabled ? 'var(--slate-400)' : 'var(--slate-900)',
    cursor: disabled ? 'not-allowed' : 'text',
  });

  const disabledSection: React.CSSProperties = { opacity: 0.45, pointerEvents: 'none' };

  return (
    <>
      <style>{`
        @keyframes qaOverlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes qaOverlayOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes qaDrawerIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes qaDrawerOut { from { transform: translateX(0) } to { transform: translateX(100%) } }
      `}</style>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 2000, animation: `${visible ? 'qaOverlayIn' : 'qaOverlayOut'} 0.28s ease forwards` }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 480, background: 'var(--white)', zIndex: 2001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.14)', animation: `${visible ? 'qaDrawerIn' : 'qaDrawerOut'} 0.28s cubic-bezier(0.4,0,0.2,1) forwards` }}>

        {/* Header */}
        <div style={{ padding: '20px 28px 14px', borderBottom: '1px solid var(--slate-200)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--slate-900)' }}>New Box Item</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--slate-400)' }}>Quick-create a product for subscription boxes</p>
            </div>
            <button onClick={handleClose}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, color: 'var(--slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}>×</button>
          </div>
          <LangTabs lang={lang} onChange={setLang} />
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '18px 28px', display: 'flex', flexDirection: 'column', gap: 15 }}>
          {errors._ && <div style={{ background: 'var(--red-50)', border: '1px solid var(--red-200)', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: 'var(--red-600)' }}>⚠ {errors._}</div>}
          {toast && <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: 'var(--green-800)' }}>✓ {toast}</div>}

          {/* Photos — always visible, same in both tabs */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 8, display: 'block' }}>Photos</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); queueFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? 'var(--teal-600)' : 'var(--slate-300)'}`, borderRadius: 12, padding: '16px', background: dragOver ? 'var(--teal-50)' : 'var(--slate-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', transition: 'all 0.15s' }}
            >
              <svg width="26" height="26" fill="none" stroke={dragOver ? 'var(--teal-600)' : 'var(--slate-400)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: dragOver ? 'var(--teal-600)' : 'var(--slate-600)' }}>Drop images here or click to browse</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--slate-400)' }}>JPEG, PNG, SVG, WebP · max 10 MB each</p>
            </div>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.svg,.webp" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) queueFiles(e.target.files); e.target.value = ''; }} />
            {imageError && <p style={{ fontSize: 11, color: 'var(--red-600)', marginTop: 4 }}>⚠ {imageError}</p>}
            {queuedPreviews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {queuedPreviews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--slate-200)' }} />
                    <button type="button" onClick={() => { setQueuedFiles(q => q.filter((_, j) => j !== i)); setQueuedPreviews(p => p.filter((_, j) => j !== i)); }}
                      style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--red-500)', border: '2px solid var(--white)', color: 'var(--white)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: (isKa ? errors.ka_name : errors.name) ? 'var(--red-600)' : 'var(--slate-600)', marginBottom: 5, display: 'flex', alignItems: 'center' }}>
              Product Name <span style={{ color: 'var(--red-600)', marginLeft: 2 }}>*</span>
            </label>
            {isKa ? (
              <>
                <input ref={nameRef} value={ka.name} onChange={e => setKaField('name', e.target.value)} placeholder="e.g. ქათმის ჯერკი" style={inp(errors.ka_name)} />
                {errors.ka_name && <p style={{ fontSize: 11, color: 'var(--red-600)', marginTop: 3 }}>⚠ {errors.ka_name}</p>}
              </>
            ) : (
              <>
                <input ref={nameRef} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Chicken Jerky Treats" style={inp(errors.name)} />
                {errors.name && <p style={{ fontSize: 11, color: 'var(--red-600)', marginTop: 3 }}>⚠ {errors.name}</p>}
              </>
            )}
          </div>

          {/* Slug — EN only */}
          <div style={isKa ? disabledSection : {}}>
            <label style={{ fontSize: 12, fontWeight: 600, color: errors.slug ? 'var(--red-600)' : 'var(--slate-600)', marginBottom: 5, display: 'flex', alignItems: 'center' }}>
              Slug <span style={{ color: 'var(--red-600)', marginLeft: 2 }}>*</span>{isKa && <DisabledBadge />}
            </label>
            <input value={slug} onChange={e => { setSlug(e.target.value); setSlugManual(true); setErrors(er => ({ ...er, slug: '' })); }} placeholder="auto-generated from name" style={inp(errors.slug, isKa)} disabled={isKa} />
            {errors.slug && <p style={{ fontSize: 11, color: 'var(--red-600)', marginTop: 3 }}>⚠ {errors.slug}</p>}
          </div>

          {/* SKU + Price — EN only */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={isKa ? disabledSection : {}}>
              <label style={{ fontSize: 12, fontWeight: 600, color: errors.sku ? 'var(--red-600)' : 'var(--slate-600)', marginBottom: 5, display: 'flex', alignItems: 'center' }}>
                SKU <span style={{ color: 'var(--red-600)', marginLeft: 2 }}>*</span>{isKa && <DisabledBadge />}
              </label>
              <input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="e.g. TRT-001" style={inp(errors.sku, isKa)} disabled={isKa} />
              {errors.sku && <p style={{ fontSize: 11, color: 'var(--red-600)', marginTop: 3 }}>⚠ {errors.sku}</p>}
            </div>
            <div style={isKa ? disabledSection : {}}>
              <label style={{ fontSize: 12, fontWeight: 600, color: errors.price ? 'var(--red-600)' : 'var(--slate-600)', marginBottom: 5, display: 'flex', alignItems: 'center' }}>
                Price (₾) <span style={{ color: 'var(--red-600)', marginLeft: 2 }}>*</span>{isKa && <DisabledBadge />}
              </label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" style={inp(errors.price, isKa)} disabled={isKa} />
              {errors.price && <p style={{ fontSize: 11, color: 'var(--red-600)', marginTop: 3 }}>⚠ {errors.price}</p>}
            </div>
          </div>

          {/* Category + Stock — EN only */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...(isKa ? disabledSection : {}) }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 5, display: 'flex', alignItems: 'center' }}>
                Category{isKa && <DisabledBadge />}
              </label>
              <Select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} disabled={isKa} style={{ ...inp(undefined, isKa), color: form.categoryId && !isKa ? 'var(--slate-900)' : 'var(--slate-400)' }}>
                <option value="">No category</option>
                {categoryOptions(categories).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 5, display: 'flex', alignItems: 'center' }}>
                Stock (units){isKa && <DisabledBadge />}
              </label>
              <input type="number" min="0" value={form.stockQuantity} onChange={e => set('stockQuantity', e.target.value)} disabled={isKa} style={inp(undefined, isKa)} />
            </div>
          </div>

          {/* Brand — EN only */}
          <div style={isKa ? disabledSection : {}}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 5, display: 'flex', alignItems: 'center' }}>
              Brand{isKa && <DisabledBadge />}
            </label>
            <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Optional" disabled={isKa} style={inp(undefined, isKa)} />
          </div>

          {/* Short Description */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 5, display: 'block' }}>Short Description</label>
            {isKa ? (
              <textarea value={ka.shortDescription} onChange={e => setKaField('shortDescription', e.target.value)} placeholder="Optional" rows={3} style={{ ...inp(), resize: 'vertical', fontFamily: 'inherit' }} />
            ) : (
              <textarea value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} placeholder="Optional" rows={3} style={{ ...inp(), resize: 'vertical', fontFamily: 'inherit' }} />
            )}
          </div>
        </form>

        {/* Footer */}
        <div style={{ padding: '14px 28px', borderTop: '1px solid var(--slate-200)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button type="submit" onClick={handleSubmit} disabled={saving}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            style={{ flex: 2, padding: '10px 0', borderRadius: 10, background: 'var(--teal-600)', color: 'var(--white)', border: 'none', cursor: saving ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, opacity: saving ? 0.7 : 1, transition: 'background 0.15s, transform 0.1s' }}>
            {saving ? 'Creating…' : 'Create Box Item'}
          </button>
          <button onClick={handleClose}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-200)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'var(--slate-100)', color: 'var(--slate-700b)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'background 0.15s, transform 0.1s' }}>Cancel</button>
        </div>
      </div>
    </>
  );
}
