'use client';
import { Select } from '@/components/Dropdown';
import { categoryOptions } from '@/components/categoryOptions';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FormField, { inputClass, parseFieldErrors } from '@/components/FormField';
import LangTabs, { type Lang } from '@/components/LangTabs';
import PricingSection from '@/components/PricingSection';
import ErrorPopup from '@/components/ErrorPopup';
import PersonalisationCard, { EMPTY_PERSONALISATION, personalisationFromProduct, personalisationPayload, type PersonalisationForm } from '@/components/PersonalisationCard';
import AllergensCard from '@/components/AllergensCard';
import SuitsCard, { EMPTY_SUITS, type Suits } from '@/components/SuitsCard';
import SellerCard, { OURS, shopPrice, termsPayload, type SellerTerms } from '@/components/SellerCard';
import { NumInput } from '@/components/NumberField';
import { getOr, post } from '@/lib/api';


const disabledInput: React.CSSProperties = {
  ...inputClass(),
  background: 'var(--slate-50)',
  color: 'var(--slate-400)',
  cursor: 'not-allowed',
  borderColor: 'var(--slate-200)',
};

const disabledSection: React.CSSProperties = {
  opacity: 0.55,
  pointerEvents: 'none',
  userSelect: 'none',
};

function DisabledBadge() {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--slate-100)', color: 'var(--slate-400)', border: '1px solid var(--slate-200)', borderRadius: 6, padding: '2px 7px', marginLeft: 8, letterSpacing: 0.3 }}>
      EN only
    </span>
  );
}

function NewProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBoxItem = searchParams.get('box') === '1';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [popupErrors, setPopupErrors] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [lang, setLang] = useState<Lang>('en');

  const [form, setForm] = useState({
    name: '', slug: '', sku: '', brand: '', shortDescription: '', description: '',
    price: '', salePrice: '', categoryId: '', includedInBox: isBoxItem, standaloneSale: true, inCustomBox: false, inMystery: false,
    seoTitle: '', seoDesc: '', stockQuantity: '0', lowStockAlert: '5',
  });

  const [ka, setKa] = useState({ name: '', shortDescription: '', description: '', seoTitle: '', seoDesc: '' });
  const [personalisation, setPersonalisation] = useState<PersonalisationForm>(EMPTY_PERSONALISATION);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [suits, setSuits] = useState<Suits>(EMPTY_SUITS);
  const [seller, setSeller] = useState<SellerTerms>(OURS);
  // A seller's product: the shop price follows their price + our margin.
  useEffect(() => {
    const f = shopPrice(seller);
    if (f != null) setForm(x => ({ ...x, price: f.toFixed(2) }));
  }, [seller]);


  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [queuedPreviews, setQueuedPreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState('');
  const [dropZoneDrag, setDropZoneDrag] = useState(false);

  useEffect(() => {
    getOr<any>('/categories', []).then(d => setCategories(Array.isArray(d) ? d : d.items || []));
  }, []);

  function queueFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImageError('');
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
    const MAX_SIZE = 10 * 1024 * 1024;
    const valid: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.includes(ext)) { rejected.push(`"${file.name}" — unsupported format`); continue; }
      if (file.size > MAX_SIZE) { rejected.push(`"${file.name}" — exceeds 10 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`); continue; }
      valid.push(file);
    }
    if (rejected.length > 0) setImageError(rejected.join('; '));
    if (valid.length === 0) return;
    setQueuedFiles(prev => [...prev, ...valid]);
    valid.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setQueuedPreviews(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removeQueued(i: number) {
    setQueuedFiles(prev => prev.filter((_, idx) => idx !== i));
    setQueuedPreviews(prev => prev.filter((_, idx) => idx !== i));
  }

  function set(key: string, value: any) {
    setForm(f => {
      const next = { ...f, [key]: value };
      if (key === 'name' && !f.slug) {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      return next;
    });
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Product name (English) is required';
    if (!form.slug.trim()) errs.slug = 'Slug is required';
    if (!form.sku.trim()) errs.sku = 'SKU is required';
    if (seller.sellerId && !(parseFloat(seller.sellerPrice) > 0)) errs.sellerPrice = "Enter the seller's price";
    else if (!form.price || Number(form.price) <= 0) errs.price = 'Price must be greater than 0';
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

    const translations: any = {};
    const hasKa = Object.values(ka).some(v => v.trim() !== '');
    if (hasKa || suits.goodForKa.trim()) translations.ka = { ...ka, ...(suits.goodForKa.trim() ? { goodFor: suits.goodForKa.trim() } : {}) };

    const body: any = {
      name: form.name, slug: form.slug, sku: form.sku,
      price: Number(form.price),
      includedInBox: form.includedInBox, standaloneSale: form.standaloneSale, inMystery: form.inMystery,
      stockQuantity: Number(form.stockQuantity), lowStockAlert: Number(form.lowStockAlert),
    };
    if (form.brand) body.brand = form.brand;
    if (form.shortDescription) body.shortDescription = form.shortDescription;
    if (form.description) body.description = form.description;
    if (form.categoryId) body.categoryId = form.categoryId;
    if (form.salePrice) body.salePrice = Number(form.salePrice);
    if (form.seoTitle) body.seoTitle = form.seoTitle;
    if (form.seoDesc) body.seoDesc = form.seoDesc;
    if (translations.ka) body.translations = translations;
    const chosen = personalisationPayload(personalisation);
    if (chosen) body.personalisation = chosen;
    if (allergens.length) body.allergens = allergens;
    if (seller.sellerId) Object.assign(body, termsPayload(seller));
    if (suits.dogSizes.length) body.dogSizes = suits.dogSizes;
    if (suits.lifeStages.length) body.lifeStages = suits.lifeStages;
    if (suits.goodFor.trim()) body.goodFor = suits.goodFor.trim();

    try {
      const product = await post('/admin/products', body);
      for (const file of queuedFiles) {
        try {
          const fd = new FormData();
          fd.append('file', file);
          const { url } = await post('/admin/upload/image', fd);
          await post(`/admin/products/${product.id}/images`, { url });
        } catch { /* non-fatal, product was created */ }
      }
      router.push('/dashboard/products');
    } catch (e: any) {
      if (Array.isArray(e.body?.message)) {
        setFieldErrors(parseFieldErrors(e.body.message));
        setError('Please fix the errors below.');
      } else {
        setError(e.body?.message || 'Failed to create product');
      }
    } finally {
      setSaving(false);
    }
  }

  const sectionStyle: React.CSSProperties = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, padding: 24, marginBottom: 20 };
  const isKa = lang === 'ka';

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.push('/dashboard/products')} style={{ fontSize: 13, color: 'var(--slate-400)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Products</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>New Product</h1>
      </div>

      <ErrorPopup errors={popupErrors} onClose={() => setPopupErrors([])} />
      {error && <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Photos */}
        <div style={sectionStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 16px' }}>Photos</p>

          {queuedPreviews.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              {queuedPreviews.map((src, i) => (
                <div key={i} style={{ position: 'relative', width: 96, height: 96 }}>
                  <img src={src} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, border: i === 0 ? '2px solid var(--teal-600)' : '1px solid var(--slate-200)', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.12)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.boxShadow = 'none'; }} />
                  {i === 0 && <span style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 9, fontWeight: 700, background: 'var(--teal-600)', color: 'var(--white)', borderRadius: 4, padding: '1px 5px' }}>MAIN</span>}
                  <button type="button" onClick={() => removeQueued(i)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-700)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-600)'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.9)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)'; }}
                    style={{ position: 'absolute', top: -7, right: -7, width: 22, height: 22, borderRadius: '50%', background: 'var(--red-600)', color: 'var(--white)', border: '2px solid var(--white)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, transition: 'transform 0.12s, background 0.12s' }}>×</button>
                </div>
              ))}
              <label
                onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--teal-600)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--teal-50b)'; (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1.03)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--slate-300)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--slate-50)'; (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1)'; }}
                onMouseDown={e => { (e.currentTarget as HTMLLabelElement).style.transform = 'scale(0.96)'; }}
                onMouseUp={e => { (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1.03)'; }}
                style={{ width: 96, height: 96, borderRadius: 10, border: '2px dashed var(--slate-300)', background: 'var(--slate-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4, transition: 'border-color 0.15s, background 0.15s, transform 0.12s' }}>
                <input type="file" accept=".jpg,.jpeg,.png,.svg,.webp" multiple style={{ display: 'none' }} onChange={e => { queueFiles(e.target.files); (e.target as HTMLInputElement).value = ''; }} />
                <span style={{ fontSize: 24, color: 'var(--slate-400)', lineHeight: 1, fontWeight: 300 }}>+</span>
                <span style={{ fontSize: 10, color: 'var(--slate-400)', fontWeight: 600 }}>Add</span>
              </label>
            </div>
          )}

          {queuedPreviews.length === 0 && (
            <label
              onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--teal-600)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--teal-50b)'; (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1.01)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = dropZoneDrag ? 'var(--teal-600)' : 'var(--slate-300)'; (e.currentTarget as HTMLLabelElement).style.background = dropZoneDrag ? 'var(--teal-50b)' : 'var(--slate-50)'; (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1)'; }}
              onMouseDown={e => { (e.currentTarget as HTMLLabelElement).style.transform = 'scale(0.99)'; }}
              onMouseUp={e => { (e.currentTarget as HTMLLabelElement).style.transform = 'scale(1.01)'; }}
              onDragEnter={e => { e.preventDefault(); setDropZoneDrag(true); (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--teal-600)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--teal-50b)'; }}
              onDragOver={e => { e.preventDefault(); }}
              onDragLeave={e => { setDropZoneDrag(false); (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--slate-300)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--slate-50)'; }}
              onDrop={e => { e.preventDefault(); setDropZoneDrag(false); (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--slate-300)'; (e.currentTarget as HTMLLabelElement).style.background = 'var(--slate-50)'; queueFiles(e.dataTransfer.files); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 150, borderRadius: 12, border: `2px dashed ${dropZoneDrag ? 'var(--teal-600)' : 'var(--slate-300)'}`, background: dropZoneDrag ? 'var(--teal-50b)' : 'var(--slate-50)', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s, transform 0.12s' }}>
              <input type="file" accept=".jpg,.jpeg,.png,.svg,.webp" multiple style={{ display: 'none' }} onChange={e => { queueFiles(e.target.files); (e.target as HTMLInputElement).value = ''; }} />
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={dropZoneDrag ? 'var(--teal-600)' : 'var(--slate-400)'} strokeWidth="1.5" style={{ transition: 'stroke 0.15s' }}>
                <path d="M4 16l4-4 4 4 4-6 4 6"/><rect x="3" y="3" width="18" height="18" rx="3"/>
              </svg>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: dropZoneDrag ? 'var(--teal-600)' : 'var(--slate-600)', margin: '0 0 3px', transition: 'color 0.15s' }}>{dropZoneDrag ? 'Drop to upload' : 'Click or drag photos here'}</p>
                <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: 0 }}>JPG · PNG · SVG · WebP · max 10 MB each</p>
              </div>
            </label>
          )}

          {imageError && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--red-50)', border: '1px solid var(--red-200)', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>
              <span style={{ fontSize: 14, color: 'var(--red-600)', lineHeight: 1, marginTop: 1 }}>⚠</span>
              <p style={{ fontSize: 12, color: 'var(--red-600)', margin: 0, lineHeight: 1.5 }}>{imageError}</p>
              <button type="button" onClick={() => setImageError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--red-600)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          )}
          {queuedPreviews.length > 0 && !imageError && <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '8px 0 0' }}>First image will be the main photo. Photos upload after the product is saved.</p>}
        </div>

        {/* Basic Information */}
        <div style={sectionStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 16px' }}>Basic Information</p>
          <LangTabs lang={lang} onChange={setLang} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
            {/* Product Name — translatable */}
            <FormField label="Product Name" required error={isKa ? fieldErrors.kaName : fieldErrors.name}>
              <input
                style={inputClass(isKa ? fieldErrors.kaName : fieldErrors.name)}
                value={isKa ? ka.name : form.name}
                onChange={e => isKa ? setKa(k => ({ ...k, name: e.target.value })) : set('name', e.target.value)}
                placeholder={isKa ? 'e.g. კლასიკური ბოლო' : 'e.g. Kong Classic Ball'}
              />
            </FormField>

            {/* Brand — EN only */}
            <FormField label={<>Brand{isKa && <DisabledBadge />}</>}>
              <input
                style={isKa ? disabledInput : inputClass()}
                value={form.brand}
                onChange={e => set('brand', e.target.value)}
                placeholder="e.g. Kong, Royal Canin"
                disabled={isKa}
              />
            </FormField>

            {/* Slug — EN only */}
            <FormField label={<>Slug{isKa && <DisabledBadge />}</>} required={!isKa} error={!isKa ? fieldErrors.slug : undefined}>
              <input
                style={isKa ? disabledInput : inputClass(fieldErrors.slug)}
                value={form.slug}
                onChange={e => set('slug', e.target.value)}
                placeholder="auto-generated from name"
                disabled={isKa}
              />
            </FormField>

            {/* SKU — EN only */}
            <FormField label={<>SKU{isKa && <DisabledBadge />}</>} required={!isKa} error={!isKa ? fieldErrors.sku : undefined}>
              <input
                style={isKa ? disabledInput : inputClass(fieldErrors.sku)}
                value={form.sku}
                onChange={e => set('sku', e.target.value)}
                placeholder="e.g. KONG-001"
                disabled={isKa}
              />
            </FormField>
          </div>

          {/* Short Description — translatable */}
          <div style={{ marginTop: 14 }}>
            <FormField label="Short Description">
              <input
                style={inputClass()}
                value={isKa ? ka.shortDescription : form.shortDescription}
                onChange={e => isKa ? setKa(k => ({ ...k, shortDescription: e.target.value })) : set('shortDescription', e.target.value)}
                placeholder="One-liner shown on product cards"
              />
            </FormField>
          </div>

          {/* Full Description — translatable */}
          <div style={{ marginTop: 14 }}>
            <FormField label="Full Description">
              <textarea
                style={{ ...inputClass(), minHeight: 80, resize: 'vertical' } as any}
                value={isKa ? ka.description : form.description}
                onChange={e => isKa ? setKa(k => ({ ...k, description: e.target.value })) : set('description', e.target.value)}
                placeholder="Detailed product description"
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
            <SellerCard value={seller} onChange={setSeller} salePrice={form.salePrice} error={fieldErrors.sellerPrice} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid var(--slate-100)' }} />
            <PricingSection
              price={form.price}
              salePrice={form.salePrice}
              onChange={(p, s) => setForm(f => ({ ...f, price: p, salePrice: s }))}
              priceError={fieldErrors.price}
              salePriceError={fieldErrors.salePrice}
              priceLocked={!!seller.sellerId}
            />
            <div style={{ marginTop: 14 }}>
              <FormField label="Category">
                <Select style={inputClass()} value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                  <option value="">No category</option>
                  {categoryOptions(categories).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </FormField>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate-600)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.includedInBox} onChange={e => set('includedInBox', e.target.checked)} />
                Included in subscription box
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate-600)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.standaloneSale} onChange={e => set('standaloneSale', e.target.checked)} />
                Available for standalone sale
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate-600)', cursor: 'pointer' }} title="Packed as a surprise in built boxes that have a mystery item. Customers never see which.">
                <input type="checkbox" checked={form.inMystery} onChange={e => set('inMystery', e.target.checked)} />
                Can be a mystery item
              </label>
            </div>
          </div>
        </div>

        {/* Personalisation */}
        <PersonalisationCard value={personalisation} onChange={setPersonalisation} disabled={isKa} style={sectionStyle} />

        {/* Allergens */}
        <AllergensCard value={allergens} onChange={setAllergens} disabled={isKa} style={sectionStyle} />
        <SuitsCard value={suits} onChange={setSuits} style={sectionStyle} />

        {/* Inventory */}
        <div style={sectionStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px', display: 'flex', alignItems: 'center' } as any}>
            Inventory{isKa && <DisabledBadge />}
          </p>
          {isKa && <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '0 0 14px' }}>Switch to English to edit inventory.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, ...(isKa ? disabledSection : {}) }}>
            <FormField label="Initial Stock Quantity">
              <NumInput style={isKa ? disabledInput : inputClass()} min="0" value={form.stockQuantity} onChange={e => set('stockQuantity', e.target.value)} disabled={isKa} />
            </FormField>
            <FormField label="Low Stock Alert Threshold">
              <NumInput style={isKa ? disabledInput : inputClass()} min="0" value={form.lowStockAlert} onChange={e => set('lowStockAlert', e.target.value)} disabled={isKa} />
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
            {saving ? 'Creating…' : 'Create Product'}
          </button>
          <button type="button" onClick={() => router.push('/dashboard/products')} style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * The form reads the query string via useSearchParams, which Next 14 refuses to
 * prerender without a Suspense boundary — without this wrapper the production
 * build fails on this route.
 */
export default function NewProductPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, fontSize: 13, color: 'var(--slate-400)' }}>Loading…</div>}>
      <NewProductForm />
    </Suspense>
  );
}
