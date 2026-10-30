'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ActionButton, FilterSelect, SortBar, SearchInput, Toolbar, StatCard, StatCards, RowActions } from '@/components/Toolbar';
import QuickAddBoxItemModal from '@/components/QuickAddBoxItemModal';
import { getOr, patch } from '@/lib/api';


const STATUS_COLORS: Record<string, any> = {
  ACTIVE:       { background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' },
  INACTIVE:     { background: 'var(--slate-50)', color: 'var(--slate-400)', border: '1px solid var(--slate-200)' },
  DRAFT:        { background: 'var(--amber-50)', color: 'var(--amber-700)', border: '1px solid var(--amber-200)' },
  OUT_OF_STOCK: { background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)' },
};

export default function BoxItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('');
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [plansByProduct, setPlansByProduct] = useState<Record<string, any[]>>({});
  const [showAddModal, setShowAddModal] = useState(false);


  async function load() {
    setLoading(true);
    try {
      const [d, cats, pd] = await Promise.all([
        getOr<any>('/admin/products?includedInBox=true&limit=200', null),
        getOr<any>('/admin/categories', null),
        getOr<any>('/admin/subscription-plans?limit=200', null),
      ]);
      if (d) setItems(d.items || []);
      if (cats) {
        setAllCategories((cats.items || cats || []).sort((a: any, b: any) => a.name.localeCompare(b.name)));
      }
      if (pd) {
        const plans: any[] = pd.items || pd || [];
        const map: Record<string, any[]> = {};
        for (const plan of plans) {
          const cfg = plan.translations?.config || {};
          const boxes: any[] = cfg.boxes || [];
          const productIds = new Set(boxes.flatMap((b: any) => (b.items || []).map((i: any) => i.productId)));
          for (const pid of productIds) {
            if (!map[pid]) map[pid] = [];
            map[pid].push(plan);
          }
        }
        setPlansByProduct(map);
      }
    } catch { } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewItem(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  async function toggleStatus(id: string, current: string) {
    setTogglingStatus(id);
    try {
      const next = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await patch(`/admin/products/${id}/status`, { status: next });
      await load();
    } catch { } finally { setTogglingStatus(null); }
  }

  const displayed = items
    .filter(p => {
      if (category && p.category?.id !== category) return false;
      if (!search) return true;
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
    })
    .sort((a, b) => {
      switch (sort) {
        case 'name_asc':   return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':  return (b.name || '').localeCompare(a.name || '');
        case 'price_asc':  return (Number(a.price) || 0) - (Number(b.price) || 0);
        case 'price_desc': return (Number(b.price) || 0) - (Number(a.price) || 0);
        case 'stock_asc':  return (a.inventory?.quantity ?? 0) - (b.inventory?.quantity ?? 0);
        case 'stock_desc': return (b.inventory?.quantity ?? 0) - (a.inventory?.quantity ?? 0);
        default: return 0;
      }
    });

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 4px' }}>Box Items</h1>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0 }}>Products that go into subscription boxes — separate from the e-commerce store.</p>
      </div>
      <StatCards>
        <StatCard value={items.length} label="items in boxes" theme="slate" />
        <StatCard value={items.filter(i => i.status === 'ACTIVE').length} label="active" theme="green" />
        <StatCard value={items.filter(i => i.status === 'INACTIVE').length} label="disabled" theme="red" />
        <StatCard value={items.filter(i => i.status === 'OUT_OF_STOCK').length} label="out of stock" theme="red" />
      </StatCards>

      {/* Toolbar */}
      <Toolbar style={{ marginBottom: 20 }}>
        <ActionButton onClick={() => setShowAddModal(true)}>+ New Box Item</ActionButton>
        <FilterSelect value={category} onChange={setCategory}>
          <option value="">All Categories</option>
          {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </FilterSelect>
        <SortBar
          sort={sort}
          onSort={setSort}
          fields={[
            { field: 'name',  label: 'Name',  icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="4 6 8 2 12 6"/><line x1="8" y1="2" x2="8" y2="22"/><path d="M16 6h4M16 12h3M16 18h2"/></svg> },
            { field: 'price', label: 'Price', icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
            { field: 'stock', label: 'Stock', icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
          ]}
        />
        <div style={{ marginLeft: 'auto' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search box items…" />
        </div>
      </Toolbar>

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🐾</div>
            <p style={{ fontSize: 13 }}>No box items found</p>
            <p style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 4 }}>Go to Products and toggle "In Box" to add items here.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Product', 'SKU', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(p => {
                const img = p.images?.[0]?.url;
                const stockQty = p.inventory?.quantity ?? 0;
                const lowAlert = p.inventory?.lowStockAlert ?? 5;
                const stockColor = stockQty === 0 ? 'var(--red-600)' : stockQty <= lowAlert ? 'var(--red-600)' : 'var(--green-600)';
                const isLow = stockQty > 0 && stockQty <= lowAlert;
                const isOut = stockQty === 0;
                const sc = STATUS_COLORS[p.status] || STATUS_COLORS.INACTIVE;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--slate-50)', background: (p.status === 'INACTIVE' || p.status === 'OUT_OF_STOCK') ? 'rgba(220,38,38,0.04)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {img ? (
                          <img src={img} alt={p.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--slate-200b)', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📦</div>
                        )}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <p style={{ fontWeight: 600, color: 'var(--slate-800)', margin: 0, fontSize: 13 }}>{p.name}</p>
                            <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--teal-50)', color: 'var(--teal-600)', border: '1px solid var(--teal-200)', borderRadius: 5, padding: '1px 6px', whiteSpace: 'nowrap' }}>📦 Box</span>
                            {(plansByProduct[p.id]?.length ?? 0) > 0 && (
                              <span title={(plansByProduct[p.id] || []).map((pl: any) => pl.name).join(', ')} style={{ fontSize: 10, fontWeight: 700, background: 'var(--blue-50)', color: 'var(--blue-600)', border: '1px solid var(--blue-200)', borderRadius: 5, padding: '1px 6px', whiteSpace: 'nowrap', cursor: 'default' }}>
                                📋 {plansByProduct[p.id].length} plan{plansByProduct[p.id].length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>{p.sku || p.brand || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--slate-500)', background: 'var(--slate-100)', padding: '3px 8px', borderRadius: 5 }}>{p.sku || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--slate-500)', fontSize: 12 }}>{p.category?.name || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {p.salePrice ? (
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--teal-600)' }}>₾{Number(p.salePrice).toFixed(2)}</span>
                          <span style={{ fontSize: 11, color: 'var(--slate-400)', textDecoration: 'line-through', display: 'block' }}>₾{Number(p.price).toFixed(2)}</span>
                        </div>
                      ) : <span style={{ fontWeight: 700, color: 'var(--slate-900)' }}>₾{Number(p.price).toFixed(2)}</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 700, color: stockColor }}>{stockQty}</span>
                      <span style={{ fontSize: 11, color: 'var(--slate-400)', marginLeft: 4 }}>units</span>
                      {isOut && <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--red-600)', background: 'var(--red-50)', border: '1px solid var(--red-200)', borderRadius: 4, padding: '1px 5px', marginTop: 3 }}>OUT OF STOCK</span>}
                      {isLow && (
                        <span title="Low stock" style={{ display: 'inline-flex', marginLeft: 4 }}>
                          <svg width="14" height="14" fill="none" stroke="var(--red-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ ...sc, display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <RowActions
                        onView={() => setViewItem(p)}
                        onConfigure={() => router.push(`/dashboard/products/${p.slug}/edit`)}
                        onToggle={() => toggleStatus(p.id, p.status)}
                        isDisabled={p.status !== 'ACTIVE'}
                        toggleLabel={p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* View modal */}
      {showAddModal && <QuickAddBoxItemModal onClose={() => setShowAddModal(false)} onCreated={load} />}
      {viewItem && (() => {
        const vi = viewItem;
        const sc = STATUS_COLORS[vi.status] || STATUS_COLORS.INACTIVE;
        const stock = vi.inventory?.quantity ?? 0;
        return (
          <div onClick={() => setViewItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              {/* Header */}
              <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--slate-200)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--slate-900)' }}>{vi.name}</h2>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, ...sc }}>{vi.status}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--slate-400)' }}>{vi.sku} · {vi.category?.name || '—'}</p>
                  </div>
                  <button onClick={() => setViewItem(null)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.9)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: 'var(--slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, transform 0.1s', flexShrink: 0 }}>×</button>
                </div>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16 }}>
                  {[
                    { label: 'Price', value: `₾${Number(vi.price).toFixed(2)}` },
                    { label: 'Stock', value: `${stock} units` },
                    { label: 'Brand', value: vi.brand || '—' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--slate-50)', borderRadius: 10, padding: '10px 14px' }}>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--slate-400)', marginBottom: 2 }}>{s.label}</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--slate-900)' }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '20px 32px' }}>
                {vi.compareAtPrice && (
                  <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--slate-400)' }}>Compare at:</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red-600)', textDecoration: 'line-through' }}>₾{Number(vi.compareAtPrice).toFixed(2)}</span>
                  </div>
                )}
                {vi.shortDescription && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Description</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-700b)' }}>{vi.shortDescription}</p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {vi.isIncludedInBox && <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, background: 'rgba(13,148,136,0.08)', color: 'var(--teal-600)', fontWeight: 600 }}>📦 In Box</span>}
                  {vi.isFeatured && <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, background: 'rgba(234,179,8,0.1)', color: 'var(--amber-700)', fontWeight: 600 }}>⭐ Featured</span>}
                </div>
                {(plansByProduct[vi.id]?.length ?? 0) > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Used in Subscription Plans</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(plansByProduct[vi.id] || []).map((plan: any) => (
                        <div key={plan.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: 10, padding: '8px 14px' }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--blue-800)' }}>{plan.name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--blue-500)' }}>
                              {plan.durationValue} {plan.durationUnit?.toLowerCase() || 'mo'} · {plan.boxCount} box{plan.boxCount !== 1 ? 'es' : ''}
                            </p>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue-800)' }}>₾{Number(plan.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(plansByProduct[vi.id]?.length ?? 0) === 0 && (
                  <div style={{ marginTop: 16, background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--slate-400)' }}>Not used in any subscription plan yet.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 32px', borderTop: '1px solid var(--slate-200)', display: 'flex', gap: 10 }}>
                <button onClick={() => { setViewItem(null); router.push(`/dashboard/products/${vi.slug}/edit`); }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'var(--teal-600)', color: 'var(--white)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'background 0.15s, transform 0.1s' }}>Edit</button>
                <button onClick={() => setViewItem(null)}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-200)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'var(--slate-100)', color: 'var(--slate-700b)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'background 0.15s, transform 0.1s' }}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
