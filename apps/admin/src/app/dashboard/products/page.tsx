'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import QuickAddBoxItemModal from '@/components/QuickAddBoxItemModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const STATUS_COLORS: Record<string, { background: string; color: string; border: string }> = {
  ACTIVE:       { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
  INACTIVE:     { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' },
  DRAFT:        { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' },
  OUT_OF_STOCK: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
};

function ProductModal({ product: p, onClose, onEdit, onToggleStatus }: { product: any; onClose: () => void; onEdit: () => void; onToggleStatus: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const stockQty = p.inventory?.quantity ?? 0;
  const lowAlert = p.inventory?.lowStockAlert ?? 5;
  const isLow = stockQty > 0 && stockQty <= lowAlert;
  const isOut = stockQty === 0;
  const sc = STATUS_COLORS[p.status] || STATUS_COLORS.INACTIVE;
  const img = p.images?.[0]?.url;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>Product Details</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* Product image + name */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'flex-start' }}>
            <div style={{ width: 80, height: 80, borderRadius: 12, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '1px solid #e8ecf0' }}>
              {img ? <img src={img} alt="" style={{ width: 80, height: 80, objectFit: 'cover' }} /> : <span style={{ fontSize: 32 }}>🐾</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{p.name}</h3>
                {p.includedInBox && <span style={{ fontSize: 10, fontWeight: 700, background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4', borderRadius: 5, padding: '2px 7px' }}>📦 Box</span>}
                <span style={{ ...sc, display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{p.status}</span>
              </div>
              {p.brand && <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>{p.brand}</p>}
              {p.shortDescription && <p style={{ fontSize: 13, color: '#475569', margin: '8px 0 0', lineHeight: 1.5 }}>{p.shortDescription}</p>}
            </div>
          </div>

          {/* Key info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'SKU', value: <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f1f5f9', padding: '2px 8px', borderRadius: 5 }}>{p.sku || '—'}</span> },
              { label: 'Category', value: p.category?.name || '—' },
              { label: 'Slug', value: <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{p.slug}</span> },
              ...(p.weight ? [{ label: 'Weight', value: `${p.weight} kg` }] : []),
              ...(p.inventory?.lowStockAlert != null ? [{ label: 'Low Stock Alert', value: `${p.inventory.lowStockAlert} units` }] : []),
              ...(p.compareAtPrice ? [{ label: 'Compare At', value: `₾${Number(p.compareAtPrice).toFixed(2)}` }] : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{label}</p>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Price</p>
              {p.salePrice ? (
                <div>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#0d9488' }}>₾{Number(p.salePrice).toFixed(2)}</span>
                  <span style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'line-through', marginLeft: 6 }}>₾{Number(p.price).toFixed(2)}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: '#0d9488', color: '#fff', borderRadius: 5, padding: '2px 7px' }}>
                    -{Math.round(((Number(p.price) - Number(p.salePrice)) / Number(p.price)) * 100)}%
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>₾{Number(p.price).toFixed(2)}</span>
              )}
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Stock</p>
              <span style={{ fontSize: 16, fontWeight: 800, color: isOut || isLow ? '#dc2626' : '#16a34a' }}>{stockQty} units</span>
              {isOut && <span style={{ display: 'inline-block', marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '1px 5px' }}>OUT OF STOCK</span>}
              {isLow && <span style={{ display: 'inline-block', marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '1px 5px' }}>⚠ LOW STOCK</span>}
            </div>
          </div>

          {/* Description */}
          {p.description && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Description</p>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>{p.description}</p>
            </div>
          )}

          {/* Tags / flags */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {p.standaloneSale && <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>🛍️ Standalone Sale</span>}
            {p.includedInBox && <span style={{ fontSize: 11, background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>📦 In Box</span>}
            {p.tags?.map((t: any) => (
              <span key={t.tag?.id} style={{ fontSize: 11, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>{t.tag?.name}</span>
            ))}
          </div>

          {/* Images row */}
          {p.images?.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {p.images.map((img: any, i: number) => (
                <img key={i} src={img.url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid #e8ecf0' }} />
              ))}
            </div>
          )}

        </div>

        {/* Sticky footer */}
        <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#fff', borderRadius: '0 0 20px 20px', flexShrink: 0 }}>
          <button onClick={onEdit}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dbeafe'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff'; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            style={{ flex: 1, background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s, transform 0.1s' }}>
            Edit Product
          </button>
          <button onClick={onToggleStatus}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = p.status === 'ACTIVE' ? '#e2e8f0' : '#dcfce7'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = p.status === 'ACTIVE' ? '#f1f5f9' : '#f0fdf4'; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            style={{ flex: 1, background: p.status === 'ACTIVE' ? '#f1f5f9' : '#f0fdf4', color: p.status === 'ACTIVE' ? '#64748b' : '#166534', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s, transform 0.1s' }}>
            {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={onClose}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e2e8f0'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s, transform 0.1s' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('');
  const [tab, setTab] = useState<'all' | 'box' | 'standalone'>('all');
  const [viewing, setViewing] = useState<any | null>(null);
  const [showBoxItemModal, setShowBoxItemModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      qs.set('limit', '200');
      const [prodRes, catRes] = await Promise.all([
        fetch(`${API}/admin/products?${qs}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/admin/categories`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data.items || []);
        setTotal(data.total || 0);
      }
      if (catRes.ok) {
        const cats = await catRes.json();
        setAllCategories((cats.items || cats || []).sort((a: any, b: any) => a.name.localeCompare(b.name)));
      }
    } catch { } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status]);

  const displayed = products
    .filter(p => {
      if (tab === 'box' && !p.includedInBox) return false;
      if (tab === 'standalone' && !p.standaloneSale) return false;
      if (category && p.category?.id !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (p.name || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q) ||
          (p.slug || '').toLowerCase().includes(q) ||
          (p.category?.name || '').toLowerCase().includes(q) ||
          (p.status || '').toLowerCase().includes(q) ||
          (p.shortDescription || '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case 'name_asc':  return (a.name || '').localeCompare(b.name || '');
        case 'name_desc': return (b.name || '').localeCompare(a.name || '');
        case 'price_asc':  return (Number(a.price) || 0) - (Number(b.price) || 0);
        case 'price_desc': return (Number(b.price) || 0) - (Number(a.price) || 0);
        case 'stock_asc':  return (a.inventory?.quantity ?? 0) - (b.inventory?.quantity ?? 0);
        case 'stock_desc': return (b.inventory?.quantity ?? 0) - (a.inventory?.quantity ?? 0);
        default: return 0;
      }
    });

  async function toggleStatus(id: string, current: string) {
    const token = localStorage.getItem('admin_token');
    const next = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await fetch(`${API}/admin/products/${id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    await load();
    // Update viewing product if it's the same one
    setViewing((v: any) => v?.id === id ? { ...v, status: next } : v);
  }

  return (
    <div style={{ padding: 32 }}>
      {viewing && (
        <ProductModal
          product={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { window.location.href = `/dashboard/products/${viewing.slug}/edit`; }}
          onToggleStatus={() => toggleStatus(viewing.id, viewing.status)}
        />
      )}

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Products</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{total} products</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <Link href="/dashboard/products/new" style={{ background: '#0d9488', color: '#fff', borderRadius: 9, padding: '7px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          + Add Product
        </Link>
        <button onClick={() => setShowBoxItemModal(true)}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#cbd5e1'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          style={{ background: '#fff', color: '#334155', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s, border-color 0.15s, transform 0.1s' }}>
          + New Box Item
        </button>
        {([
          { key: 'all', label: `All (${products.length})` },
          { key: 'box', label: `📦 Box (${products.filter(p => p.includedInBox).length})` },
          { key: 'standalone', label: `🛍️ Products (${products.filter(p => p.standaloneSale).length})` },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '7px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === t.key ? '#0d9488' : '#f1f5f9', color: tab === t.key ? '#fff' : '#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { value: '', label: 'All' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'OUT_OF_STOCK', label: 'Out of stock' },
        ].map(s => (
          <button key={s.value} onClick={() => setStatus(s.value)} style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${status === s.value ? '#0d9488' : '#e2e8f0'}`, background: status === s.value ? '#0d9488' : '#fff', color: status === s.value ? '#fff' : '#64748b', transition: 'all 0.15s' }}>
            {s.label}
          </button>
        ))}
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ padding: '5px 28px 5px 10px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${category ? '#0d9488' : '#e2e8f0'}`, background: category ? '#f0fdfa' : '#fff', color: category ? '#0d9488' : '#64748b', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
        >
          <option value="">All Categories</option>
          {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Sort controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: '3px 4px' }}>
          {([
            { field: 'name',  icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="4 6 8 2 12 6"/><line x1="8" y1="2" x2="8" y2="22"/><path d="M16 6h4M16 12h3M16 18h2"/></svg>, label: 'Name' },
            { field: 'price', icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, label: 'Price' },
            { field: 'stock', icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>, label: 'Stock' },
          ] as const).map(({ field, icon, label }) => {
            const active = sort.startsWith(field);
            const asc = sort === `${field}_asc`;
            return (
              <button
                key={field}
                title={label}
                onClick={() => setSort(active ? (asc ? `${field}_desc` : '') : `${field}_asc`)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: active ? '#fff' : 'transparent', color: active ? '#0d9488' : '#94a3b8', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.12s' }}
              >
                {icon}
                <span>{label}</span>
                {active && (
                  <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    {asc ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13, pointerEvents: 'none' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" style={{ paddingLeft: 32, paddingRight: 14, paddingTop: 7, paddingBottom: 7, fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 999, outline: 'none', background: '#fff', width: 200 }} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid #99f6e4', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#cbd5e1' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🛍️</div>
            <p style={{ fontSize: 13 }}>No products found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Product', 'SKU', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8ecf0', background: '#f8fafc', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((p) => {
                const stockQty = p.inventory?.quantity ?? 0;
                const lowAlert = p.inventory?.lowStockAlert ?? 5;
                const stockColor = stockQty === 0 ? '#dc2626' : stockQty <= lowAlert ? '#dc2626' : '#16a34a';
                const isLow = stockQty > 0 && stockQty <= lowAlert;
                const isOut = stockQty === 0;
                const sc = STATUS_COLORS[p.status] || STATUS_COLORS.INACTIVE;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', background: (p.status === 'INACTIVE' || p.status === 'OUT_OF_STOCK') ? 'rgba(220,38,38,0.04)' : 'transparent' }} onClick={() => setViewing(p)}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {p.images?.[0] ? <img src={p.images[0].url} alt="" style={{ width: 40, height: 40, objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>🐾</span>}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>{p.name}</p>
                            {p.includedInBox && <span style={{ fontSize: 10, fontWeight: 700, background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4', borderRadius: 5, padding: '1px 6px', whiteSpace: 'nowrap' }}>📦 Box</span>}
                          </div>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>{p.sku || '—'}</span>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748b' }}>{p.category?.name || '—'}</td>
                    <td style={{ padding: '14px 18px' }}>
                      {p.salePrice ? (
                        <div>
                          <span style={{ fontWeight: 700, color: '#0d9488' }}>₾{Number(p.salePrice).toFixed(2)}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through', display: 'block' }}>₾{Number(p.price).toFixed(2)}</span>
                        </div>
                      ) : <span style={{ fontWeight: 700, color: '#0f172a' }}>₾{Number(p.price).toFixed(2)}</span>}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontWeight: 700, color: stockColor }}>{stockQty}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>units</span>
                      {isOut && <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '1px 5px', marginTop: 3 }}>OUT OF STOCK</span>}
                      {isLow && <span title="Low stock" style={{ display: 'inline-flex', marginTop: 4, width: 18, height: 18, alignItems: 'center', justifyContent: 'center', background: '#fef2f2', borderRadius: 4, color: '#dc2626' }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      </span>}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ ...sc, display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '14px 18px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setViewing(p)} title="View details" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(13,148,136,0.1)', color: '#0d9488', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
                        </button>
                        <Link href={`/dashboard/products/${p.slug}/edit`} title="Edit" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: 'none', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </Link>
                        <button onClick={() => toggleStatus(p.id, p.status)} title={p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.status === 'ACTIVE' ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)', color: p.status === 'ACTIVE' ? '#dc2626' : '#16a34a' }}>
                          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {showBoxItemModal && <QuickAddBoxItemModal onClose={() => setShowBoxItemModal(false)} onCreated={load} />}
    </div>
  );
}
