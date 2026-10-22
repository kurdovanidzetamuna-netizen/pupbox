'use client';
import { Select } from '@/components/Dropdown';
import { useEffect, useState } from 'react';
import FormField, { inputClass } from '@/components/FormField';
import LangTabs, { type Lang } from '@/components/LangTabs';
import { NumInput } from '@/components/NumberField';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOG_SIZES = ['', 'SMALL', 'MEDIUM', 'LARGE', 'XLARGE'];

const inp = { width: '100%', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '9px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 };

export default function BoxCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), dogSize: '' });
  const [ka, setKa] = useState({ name: '', description: '' });
  const [lang, setLang] = useState<Lang>('en');
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [packingList, setPackingList] = useState<any[] | null>(null);

  function token() {
    // Guarded: this page is statically prerendered at build time, where there
    // is no window and localStorage is undefined.
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('admin_token') || '';
  }
  // Must stay a function — evaluating it in the component body ran during
  // prerender and crashed the production build.
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  async function load() {
    setLoading(true);
    try {
      const [camps, prods] = await Promise.all([
        fetch(`${API}/box-campaigns`, { headers: headers() }).then(r => r.json()),
        fetch(`${API}/admin/products?includedInBox=true&limit=200`, { headers: headers() }).then(r => r.json()),
      ]);
      setCampaigns(Array.isArray(camps) ? camps : []);
      setProducts(prods?.items || []);
    } catch { } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createCampaign() {
    setSaving(true);
    const hasKa = Object.values(ka).some(v => v.trim() !== '');
    const body: any = { ...form, dogSize: form.dogSize || null };
    if (hasKa) body.translations = { ka: { ...ka } };
    await fetch(`${API}/box-campaigns`, { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    setCreating(false);
    load();
  }

  async function toggleActive(c: any) {
    await fetch(`${API}/box-campaigns/${c.id}`, { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !c.isActive }) });
    load();
  }

  async function setProductsForCampaign(campaignId: string, items: { productId: string; quantity: number }[]) {
    await fetch(`${API}/box-campaigns/${campaignId}/products`, { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
    load();
    setSelected(null);
  }

  async function loadPackingList() {
    const now = new Date();
    const res = await fetch(`${API}/box-campaigns/packing-list?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, { headers: headers() });
    setPackingList(await res.json());
  }

  if (packingList) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Packing List</h1>
            <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{packingList.length} subscriptions to pack this month</p>
          </div>
          <button onClick={() => setPackingList(null)} style={{ fontSize: 13, color: 'var(--slate-400)', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
        </div>
        <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Customer', 'Plan', 'Dog', 'Campaign', 'Products'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packingList.map((row: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--slate-50)' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <p style={{ fontWeight: 600, color: 'var(--slate-800)', margin: 0 }}>{row.customer}</p>
                    <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>{row.email}</p>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--slate-500)' }}>{row.plan}</td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--slate-500)' }}>{row.dogName || '—'} {row.dogSize ? `(${row.dogSize})` : ''}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal-700)', background: 'var(--teal-50)', padding: '3px 8px', borderRadius: 6 }}>{row.campaign}</span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--slate-500)' }}>{row.products.map((p: any) => `${p.name} ×${p.quantity}`).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (selected) {
    return <ProductPicker campaign={selected} products={products} onSave={setProductsForCampaign} onBack={() => setSelected(null)} />;
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: 'var(--amber-800)', lineHeight: 1.6 }}>
        💡 <strong>How it works:</strong> Each campaign defines what goes in the box for a specific month + dog size. Subscribers automatically receive the campaign that matches their dog's size. Products available here are only those marked as "Box Items" in the Products page.
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Box Campaigns</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{campaigns.length} campaigns</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadPackingList} style={{ fontSize: 13, fontWeight: 600, padding: '9px 16px', borderRadius: 10, background: 'var(--white)', color: 'var(--slate-500)', border: '1px solid var(--slate-200)', cursor: 'pointer' }}>
            📋 Packing List
          </button>
          <button onClick={() => setCreating(true)} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + New Campaign
          </button>
        </div>
      </div>

      {creating && (
        <div style={{ background: 'var(--white)', borderRadius: 16, border: '2px solid var(--teal-200)', padding: 28, marginBottom: 24, maxWidth: 520, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>Create Campaign</h2>
            <button onClick={() => setCreating(false)} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>
          <LangTabs lang={lang} onChange={setLang} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="Campaign Name" required>
              <input placeholder="July 2026 — All Sizes" value={lang === 'en' ? form.name : ka.name} onChange={e => lang === 'en' ? setForm({ ...form, name: e.target.value }) : setKa({ ...ka, name: e.target.value })} style={inputClass()} />
            </FormField>
            <FormField label="Description">
              <input value={lang === 'en' ? form.description : ka.description} onChange={e => lang === 'en' ? setForm({ ...form, description: e.target.value }) : setKa({ ...ka, description: e.target.value })} style={inputClass()} />
            </FormField>
            {lang === 'en' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <FormField label="Month">
                  <Select value={form.month} onChange={e => setForm({ ...form, month: +e.target.value })} style={inputClass()}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </Select>
                </FormField>
                <FormField label="Year">
                  <NumInput value={form.year} onChange={e => setForm({ ...form, year: +e.target.value })} style={inputClass()} />
                </FormField>
                <FormField label="Dog Size">
                  <Select value={form.dogSize} onChange={e => setForm({ ...form, dogSize: e.target.value })} style={inputClass()}>
                    <option value="">All sizes</option>
                    {DOG_SIZES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </FormField>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button onClick={createCampaign} disabled={saving || !form.name} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: saving || !form.name ? 'default' : 'pointer', opacity: saving || !form.name ? 0.5 : 1 }}>{saving ? 'Creating…' : 'Create'}</button>
              <button onClick={() => setCreating(false)} style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
          <p style={{ fontSize: 13 }}>No campaigns yet — create one above</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {campaigns.map((c: any) => (
            <div key={c.id} style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>{c.name}</h3>
                  <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '4px 0 0' }}>{MONTHS[c.month - 1]} {c.year} · {c.dogSize || 'All sizes'}</p>
                </div>
                <button onClick={() => toggleActive(c)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, fontWeight: 600, border: 'none', cursor: 'pointer', background: c.isActive ? 'var(--green-50)' : 'var(--slate-100)', color: c.isActive ? 'var(--green-800)' : 'var(--slate-400)' }}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>{c.products?.length || 0} products</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {c.products?.slice(0, 3).map((p: any) => (
                    <span key={p.id} style={{ fontSize: 11, background: 'var(--teal-50)', color: 'var(--teal-700)', padding: '3px 10px', borderRadius: 8, fontWeight: 600 }}>{p.product.name} ×{p.quantity}</span>
                  ))}
                  {c.products?.length > 3 && <span style={{ fontSize: 11, color: 'var(--slate-400)', alignSelf: 'center' }}>+{c.products.length - 3} more</span>}
                  {(!c.products || c.products.length === 0) && <span style={{ fontSize: 11, color: 'var(--slate-300)' }}>No products assigned</span>}
                </div>
              </div>
              <button onClick={() => setSelected(c)} style={{ width: '100%', fontSize: 13, padding: '9px', borderRadius: 10, border: '1px dashed var(--teal-200)', background: 'transparent', color: 'var(--teal-600)', cursor: 'pointer', fontWeight: 600 }}>
                Edit Products →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductPicker({ campaign, products, onSave, onBack }: any) {
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>(
    campaign.products?.map((p: any) => ({ productId: p.productId, quantity: p.quantity })) || []
  );
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  function toggleProduct(productId: string) {
    setItems(prev => prev.find(i => i.productId === productId) ? prev.filter(i => i.productId !== productId) : [...prev, { productId, quantity: 1 }]);
  }

  function setQty(productId: string, qty: number) {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i));
  }

  async function save() { setSaving(true); await onSave(campaign.id, items); setSaving(false); }

  const filtered = products.filter((p: any) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Assign Products</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>Campaign: {campaign.name}</p>
        </div>
        <button onClick={onBack} style={{ fontSize: 13, color: 'var(--slate-400)', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
      </div>

      <div style={{ maxWidth: 600 }}>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter products…" style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 10, outline: 'none', background: 'var(--white)', boxSizing: 'border-box' }} />
        </div>
        <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ maxHeight: 380, overflowY: 'auto', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((p: any) => {
              const sel = items.find(i => i.productId === p.id);
              return (
                <div key={p.id} onClick={() => toggleProduct(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, cursor: 'pointer', border: sel ? '1px solid var(--teal-200)' : '1px solid var(--slate-100)', background: sel ? 'var(--teal-50)' : 'var(--white)', transition: 'all 0.12s' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: sel ? 'var(--teal-600)' : 'transparent', border: sel ? 'none' : '2px solid var(--slate-300b)' }}>
                    {sel && <span style={{ color: 'var(--white)', fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--slate-700b)' }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--slate-400)', marginRight: 8 }}>{p.sku}</span>
                  {sel && (
                    <NumInput value={sel.quantity} min={1} onClick={e => e.stopPropagation()} onChange={e => setQty(p.id, +e.target.value)} style={{ width: 56, border: '1px solid var(--slate-200)', borderRadius: 8, padding: '4px 8px', fontSize: 12, textAlign: 'center', outline: 'none' }} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 16, borderTop: '1px solid var(--slate-100)' }}>
            <button onClick={save} disabled={saving} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '9px 24px', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : `Save ${items.length} product${items.length !== 1 ? 's' : ''}`}
            </button>
            <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>{items.length} selected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
