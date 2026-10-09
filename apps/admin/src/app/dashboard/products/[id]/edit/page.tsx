'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import FormField, { inputClass, parseFieldErrors } from '@/components/FormField';
import LangTabs, { type Lang } from '@/components/LangTabs';
import PricingSection from '@/components/PricingSection';
import ErrorPopup from '@/components/ErrorPopup';
import PersonalisationCard, { EMPTY_PERSONALISATION, personalisationFromProduct, personalisationPayload, type PersonalisationForm } from '@/components/PersonalisationCard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [popupErrors, setPopupErrors] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [productId, setProductId] = useState('');
  const [lang, setLang] = useState<Lang>('en');

  const [form, setForm] = useState({
    name: '', slug: '', sku: '', brand: '', shortDescription: '', description: '',
    price: '', salePrice: '', categoryId: '', includedInBox: false, standaloneSale: true,
    seoTitle: '', seoDesc: '', stockQuantity: '', lowStockAlert: '',
  });
  const [images, setImages] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [dropZoneHover, setDropZoneHover] = useState(false);
  const [dropZoneDrag, setDropZoneDrag] = useState(false);

  const [ka, setKa] = useState({ name: '', shortDescription: '', description: '', seoTitle: '', seoDesc: '' });
  const [personalisation, setPersonalisation] = useState<PersonalisationForm>(EMPTY_PERSONALISATION);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    Promise.all([
      fetch(`${API}/admin/products/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/categories`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([product, cats]) => {
      setCategories(Array.isArray(cats) ? cats : cats.items || []);
      // A wrong or deleted product: say so rather than show an empty form
      // whose Save would fail.
      if (!product?.id) { setError('This product was not found. Open it again from the product list.'); return; }
      setProductId(product.id);
      setImages(product.images || []);
      setForm({
        name: product.name || '',
        slug: product.slug || '',
        sku: product.sku || '',
        brand: product.brand || '',
        shortDescription: product.shortDescription || '',
        description: product.description || '',
        price: product.price != null ? String(product.price) : '',
        salePrice: product.salePrice != null ? String(product.salePrice) : '',
        categoryId: product.category?.id || product.categoryId || '',
        includedInBox: product.includedInBox ?? false,
        standaloneSale: product.standaloneSale ?? true,
        seoTitle: product.seoTitle || '',
        seoDesc: product.seoDesc || '',
        stockQuantity: product.inventory?.quantity != null ? String(product.inventory.quantity) : '',
        lowStockAlert: product.inventory?.lowStockAlert != null ? String(product.inventory.lowStockAlert) : '',
      });
      const kaData = product.translations?.ka;
      setPersonalisation(personalisationFromProduct(product));
      if (kaData) setKa({ name: kaData.name || '', shortDescription: kaData.shortDescription || '', description: kaData.description || '', seoTitle: kaData.seoTitle || '', seoDesc: kaData.seoDesc || '' });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImageError('');

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
    const MAX_SIZE = 10 * 1024 * 1024;

    const valid: File[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(files)) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
        rejected.push(`"${file.name}" — unsupported format`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        rejected.push(`"${file.name}" — exceeds 10 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
        continue;
      }
      valid.push(file);
    }

    if (rejected.length > 0) {
      setImageError(rejected.join('; '));
      if (valid.length === 0) return;
    }

    setUploadingImage(true);
    const token = localStorage.getItem('admin_token');
    const errors: string[] = [];
    try {
      for (const file of valid) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch(`${API}/admin/upload/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!uploadRes.ok) { errors.push(`Failed to upload "${file.name}"`); continue; }
        const { url } = await uploadRes.json();
        const imgRes = await fetch(`${API}/admin/products/${productId}/images`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (!imgRes.ok) { errors.push(`Failed to save "${file.name}"`); continue; }
        const img = await imgRes.json();
        setImages(prev => [...prev, img]);
      }
      if (errors.length > 0) setImageError(errors.join('; '));
    } catch { setImageError('Upload failed'); } finally { setUploadingImage(false); }
  }

  async function removeImage(imageId: string) {
    const token = localStorage.getItem('admin_token');
    try {
      await fetch(`${API}/admin/products/${productId}/images/${imageId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      setImages(prev => prev.filter(i => i.id !== imageId));
    } catch { }
  }

  function set(key: string, value: any) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Product name (English) is required';
    if (!form.slug.trim()) errs.slug = 'Slug is required';
    if (!form.sku.trim()) errs.sku = 'SKU is required';
    if (!form.price || Number(form.price) <= 0) errs.price = 'Price must be greater than 0';
    if (!ka.name.trim()) errs.kaName = 'Product name (Georgian) is required';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
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
    const body: any = {
      name: form.name, slug: form.slug, sku: form.sku,
      price: Number(form.price),
      includedInBox: form.includedInBox, standaloneSale: form.standaloneSale,
    };
    if (form.brand) body.brand = form.brand;
    if (form.shortDescription) body.shortDescription = form.shortDescription;
    if (form.description) body.description = form.description;
    if (form.categoryId) body.categoryId = form.categoryId;
    if (form.salePrice) body.salePrice = Number(form.salePrice);
    if (form.seoTitle) body.seoTitle = form.seoTitle;
    if (form.seoDesc) body.seoDesc = form.seoDesc;
    if (form.stockQuantity) body.stockQuantity = Number(form.stockQuantity);
    if (form.lowStockAlert) body.lowStockAlert = Number(form.lowStockAlert);
    if (hasKa) body.translations = { ka: { ...ka } };
    body.personalisation = personalisationPayload(personalisation);

    try {
      const res = await fetch(`${API}/admin/products/${productId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.push('/dashboard/products');
      } else {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.message)) {
          setFieldErrors(parseFieldErrors(data.message));
          setError('Please fix the errors below.');
        } else {
          setError(data.message || 'Failed to save product');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const sectionStyle: React.CSSProperties = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, padding: 24, marginBottom: 20 };
  const isKa = lang === 'ka';
  const disabledInput: React.CSSProperties = { ...inputClass(), background: 'var(--slate-50)', color: 'var(--slate-400)', cursor: 'not-allowed', borderColor: 'var(--slate-200)' };
  const disabledSection: React.CSSProperties = { opacity: 0.55, pointerEvents: 'none', userSelect: 'none' };
  function DisabledBadge() {
    return <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--slate-100)', color: 'var(--slate-400)', border: '1px solid var(--slate-200)', borderRadius: 6, padding: '2px 7px', marginLeft: 8, letterSpacing: 0.3 }}>EN only</span>;
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.push('/dashboard/products')} style={{ fontSize: 13, color: 'var(--slate-400)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Products</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Edit Product</h1>
      </div>

      <ErrorPopup errors={popupErrors} onClose={() => setPopupErrors([])} />
      {error && <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Photos — always visible, above basic info */}
        <div style={sectionStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 16px' }}>Photos</p>

          {/* Existing images + inline add tile */}
          {images.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              {images.map((img, i) => (
                <div key={img.id} style={{ position: 'relative', width: 96, height: 96 }}>
                  <img src={img.url} alt={img.altText || ''} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, border: i === 0 ? '2px solid var(--teal-600)' : '1px solid var(--slate-200)', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.12)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.boxShadow = 'none'; }} />
                  {i === 0 && <span style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 9, fontWeight: 700, background: 'var(--teal-600)', color: 'var(--white)', borderRadius: 4, padding: '1px 5px' }}>MAIN</span>}
                  <button type="button" onClick={() => removeImage(img.id)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-700)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-600)'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.9)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)'; }}
                    style={{ position: 'absolute', top: -7, right: -7, width: 22, height: 22, borderRadius: '50%', background: 'var(--red-600)', color: 'var(--white)', border: '2px solid var(--white)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, transition: 'transform 0.12s, background 0.12s' }}>×</button>
                </div>
              ))}

              {/* Inline add tile */}
              <label
                onMouseEnter={e => { if (!uploadingImage) { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--teal-600)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--teal-50b)'; (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1.03)'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--slate-300)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--slate-50)'; (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1)'; }}
                onMouseDown={e => { if (!uploadingImage) (e.currentTarget as HTMLLabelElement).style.transform = 'scale(0.96)'; }}
                onMouseUp={e => { if (!uploadingImage) (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1.03)'; }}
                style={{ width: 96, height: 96, borderRadius: 10, border: '2px dashed var(--slate-300)', background: 'var(--slate-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: uploadingImage ? 'not-allowed' : 'pointer', gap: 4, transition: 'border-color 0.15s, background 0.15s, transform 0.12s' }}>
                <input type="file" accept=".jpg,.jpeg,.png,.svg,.webp" multiple style={{ display: 'none' }} disabled={uploadingImage} onChange={e => { handleImageFiles(e.target.files); (e.target as HTMLInputElement).value = ''; }} />
                {uploadingImage ? (
                  <div style={{ width: 20, height: 20, border: '3px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                ) : (
                  <>
                    <span style={{ fontSize: 24, color: 'var(--slate-400)', lineHeight: 1, fontWeight: 300 }}>+</span>
                    <span style={{ fontSize: 10, color: 'var(--slate-400)', fontWeight: 600 }}>Add</span>
                  </>
                )}
              </label>
            </div>
          )}

          {/* Empty state drop zone */}
          {images.length === 0 && (
            <label
              onMouseEnter={e => { if (!uploadingImage) { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--teal-600)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--teal-50b)'; (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1.01)'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = dropZoneDrag ? 'var(--teal-600)' : 'var(--slate-300)'; (e.currentTarget as HTMLLabelElement).style.background = dropZoneDrag ? 'var(--teal-50b)' : 'var(--slate-50)'; (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1)'; }}
              onMouseDown={e => { if (!uploadingImage) (e.currentTarget as HTMLLabelElement).style.transform = 'scale(0.99)'; }}
              onMouseUp={e => { if (!uploadingImage) (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1.01)'; }}
              onDragEnter={e => { e.preventDefault(); setDropZoneDrag(true); (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--teal-600)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--teal-50b)'; }}
              onDragOver={e => { e.preventDefault(); }}
              onDragLeave={e => { setDropZoneDrag(false); (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--slate-300)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--slate-50)'; }}
              onDrop={e => { e.preventDefault(); setDropZoneDrag(false); (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--slate-300)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--slate-50)'; handleImageFiles(e.dataTransfer.files); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 150, borderRadius: 12, border: `2px dashed ${dropZoneDrag ? 'var(--teal-600)' : 'var(--slate-300)'}`, background: dropZoneDrag ? 'var(--teal-50b)' : 'var(--slate-50)', cursor: uploadingImage ? 'not-allowed' : 'pointer', transition: 'border-color 0.15s, background 0.15s, transform 0.12s' }}>
              <input type="file" accept=".jpg,.jpeg,.png,.svg,.webp" multiple style={{ display: 'none' }} disabled={uploadingImage} onChange={e => { handleImageFiles(e.target.files); (e.target as HTMLInputElement).value = ''; }} />
              {uploadingImage ? (
                <div style={{ width: 32, height: 32, border: '3px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={dropZoneDrag ? 'var(--teal-600)' : 'var(--slate-400)'} strokeWidth="1.5" style={{ transition: 'stroke 0.15s' }}>
                    <path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="3"/>
                  </svg>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: dropZoneDrag ? 'var(--teal-600)' : 'var(--slate-600)', margin: '0 0 3px', transition: 'color 0.15s' }}>{dropZoneDrag ? 'Drop to upload' : 'Click or drag photos here'}</p>
                    <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: 0 }}>JPG · PNG · SVG · WebP · max 10 MB each</p>
                  </div>
                </>
              )}
            </label>
          )}

          {/* Validation error */}
          {imageError && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--red-50)', border: '1px solid var(--red-200)', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>
              <span style={{ fontSize: 14, color: 'var(--red-600)', lineHeight: 1, marginTop: 1 }}>⚠</span>
              <p style={{ fontSize: 12, color: 'var(--red-600)', margin: 0, lineHeight: 1.5 }}>{imageError}</p>
              <button type="button" onClick={() => setImageError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--red-600)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          )}

          {images.length > 0 && !imageError && <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '8px 0 0' }}>First image is the main photo. You can delete and re-add to reorder.</p>}
        </div>

        {/* Basic Information */}
        <div style={sectionStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 16px' }}>Basic Information</p>
          <LangTabs lang={lang} onChange={setLang} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
            <FormField label="Product Name" required error={isKa ? fieldErrors.kaName : fieldErrors.name}>
              <input
                style={inputClass(isKa ? fieldErrors.kaName : fieldErrors.name)}
                value={isKa ? ka.name : form.name}
                onChange={e => isKa ? setKa(k => ({ ...k, name: e.target.value })) : set('name', e.target.value)}
              />
            </FormField>
            <FormField label={<>Brand{isKa && <DisabledBadge />}</>}>
              <input style={isKa ? disabledInput : inputClass()} value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Kong, Royal Canin" disabled={isKa} />
            </FormField>
            <FormField label={<>Slug{isKa && <DisabledBadge />}</>} required={!isKa} error={!isKa ? fieldErrors.slug : undefined}>
              <input style={isKa ? disabledInput : inputClass(fieldErrors.slug)} value={form.slug} onChange={e => set('slug', e.target.value)} disabled={isKa} />
            </FormField>
            <FormField label={<>SKU{isKa && <DisabledBadge />}</>} required={!isKa} error={!isKa ? fieldErrors.sku : undefined}>
              <input style={isKa ? disabledInput : inputClass(fieldErrors.sku)} value={form.sku} onChange={e => set('sku', e.target.value)} disabled={isKa} />
            </FormField>
          </div>
          <div style={{ marginTop: 14 }}>
            <FormField label="Short Description">
              <input
                style={inputClass()}
                value={isKa ? ka.shortDescription : form.shortDescription}
                onChange={e => isKa ? setKa(k => ({ ...k, shortDescription: e.target.value })) : set('shortDescription', e.target.value)}
              />
            </FormField>
          </div>
          <div style={{ marginTop: 14 }}>
            <FormField label="Full Description">
              <textarea
                style={{ ...inputClass(), minHeight: 80, resize: 'vertical' } as any}
                value={isKa ? ka.description : form.description}
                onChange={e => isKa ? setKa(k => ({ ...k, description: e.target.value })) : set('description', e.target.value)}
              />
            </FormField>
          </div>
        </div>

        {/* Pricing & Category */}
        <div style={sectionStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px', display: 'flex', alignItems: 'center' } as any}>
            Pricing & Category{isKa && <DisabledBadge />}
          </p>
          {isKa && <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '0 0 14px' }}>Switch to English to edit pricing.</p>}
          <div style={isKa ? disabledSection : {}}>
            <PricingSection
              price={form.price}
              salePrice={form.salePrice}
              onChange={(p, s) => setForm(f => ({ ...f, price: p, salePrice: s }))}
              priceError={fieldErrors.price}
              salePriceError={fieldErrors.salePrice}
            />
            <div style={{ marginTop: 14 }}>
              <FormField label="Category">
                <select style={inputClass()} value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                  <option value="">No category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormField>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate-600)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.includedInBox} onChange={e => set('includedInBox', e.target.checked)} />
                Included in box
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate-600)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.standaloneSale} onChange={e => set('standaloneSale', e.target.checked)} />
                Standalone sale
              </label>
            </div>
          </div>
        </div>

        {/* Personalisation */}
        <PersonalisationCard value={personalisation} onChange={setPersonalisation} disabled={isKa} style={sectionStyle} />

        {/* Inventory */}
        <div style={sectionStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px', display: 'flex', alignItems: 'center' } as any}>
            Inventory{isKa && <DisabledBadge />}
          </p>
          {isKa && <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '0 0 14px' }}>Switch to English to edit inventory.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, ...(isKa ? disabledSection : {}) }}>
            <FormField label="Stock Quantity">
              <input style={isKa ? disabledInput : inputClass()} type="number" min="0" value={form.stockQuantity} onChange={e => set('stockQuantity', e.target.value)} disabled={isKa} />
            </FormField>
            <FormField label="Low Stock Alert">
              <input style={isKa ? disabledInput : inputClass()} type="number" min="0" value={form.lowStockAlert} onChange={e => set('lowStockAlert', e.target.value)} disabled={isKa} />
            </FormField>
          </div>
        </div>

        {/* SEO */}
        <div style={sectionStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 16px' }}>SEO</p>
          <div style={{ marginBottom: 14 }}>
            <FormField label="SEO Title">
              <input
                style={inputClass()}
                value={isKa ? ka.seoTitle : form.seoTitle}
                onChange={e => isKa ? setKa(k => ({ ...k, seoTitle: e.target.value })) : set('seoTitle', e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="SEO Description">
            <input
              style={inputClass()}
              value={isKa ? ka.seoDesc : form.seoDesc}
              onChange={e => isKa ? setKa(k => ({ ...k, seoDesc: e.target.value })) : set('seoDesc', e.target.value)}
            />
          </FormField>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={saving} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => router.push('/dashboard/products')} style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
