'use client';
import { useEffect, useState } from 'react';
import FormField, { inputClass, parseFieldErrors } from '@/components/FormField';
import ErrorPopup from '@/components/ErrorPopup';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const EMPTY_FORM = { code: '', discountType: 'PERCENTAGE', discountValue: '', usageLimit: '', expiresAt: '', description: '' };

const inp = { width: '100%', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '9px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 };

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [popupErrors, setPopupErrors] = useState<string[]>([]);

  const token = () => localStorage.getItem('admin_token');

  async function load() {
    setLoading(true);
    const res = await fetch(`${API}/admin/coupons`, { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    setCoupons(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowForm(false); setError(''); setForm(EMPTY_FORM); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const msgs: string[] = [];
    if (!form.code.trim()) msgs.push('Coupon code is required');
    if (!form.discountValue || Number(form.discountValue) <= 0) msgs.push('Discount value must be greater than 0');
    if (form.discountType === 'PERCENTAGE' && Number(form.discountValue) > 100) msgs.push('Percentage discount cannot exceed 100%');
    if (msgs.length > 0) { setPopupErrors(msgs); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/admin/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, discountValue: Number(form.discountValue), usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined, expiresAt: form.expiresAt || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`${API}/admin/coupons/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ isActive: !current }) });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this coupon?')) return;
    await fetch(`${API}/admin/coupons/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    load();
  }

  const active = coupons.filter(c => c.isActive).length;

  return (
    <div style={{ padding: 32 }}>
      <ErrorPopup errors={popupErrors} onClose={() => setPopupErrors([])} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Coupons</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{coupons.length} coupons · {active} active</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + New Coupon
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: 'var(--white)', borderRadius: 16, border: '2px solid var(--teal-200)', padding: 28, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>Create New Coupon</h2>
            <button onClick={() => { setShowForm(false); setError(''); setForm(EMPTY_FORM); }} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
          {error && <p style={{ fontSize: 13, color: 'var(--red-600)', background: 'var(--red-50)', padding: '10px 16px', borderRadius: 8, marginBottom: 16 }}>{error}</p>}
          <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <FormField label="Code" required>
              <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} style={{ ...inputClass(), fontFamily: 'monospace', textTransform: 'uppercase' }} placeholder="SUMMER20" />
            </FormField>
            <FormField label="Type" required>
              <select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })} style={inputClass()}>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed (₾)</option>
              </select>
            </FormField>
            <FormField label="Value" required>
              <input required type="number" min="0" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} style={inputClass()} placeholder={form.discountType === 'PERCENTAGE' ? '20' : '10'} />
            </FormField>
            <FormField label="Usage limit">
              <input type="number" min="1" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: e.target.value })} style={inputClass()} placeholder="Unlimited" />
            </FormField>
            <FormField label="Expires">
              <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} style={inputClass()} />
            </FormField>
            <FormField label="Description">
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inputClass()} placeholder="Internal note" />
            </FormField>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="submit" disabled={saving} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '9px 24px', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Creating…' : 'Create Coupon'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError(''); setForm(EMPTY_FORM); }} style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', border: 'none', borderRadius: 10, padding: '9px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : coupons.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏷️</div>
            <p style={{ fontSize: 13 }}>No coupons yet — create one above</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Code', 'Discount', 'Used', 'Limit', 'Expires', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--slate-50)' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--slate-900)', background: 'var(--slate-100)', padding: '5px 12px', borderRadius: 8, fontSize: 13, letterSpacing: '0.08em' }}>{c.code}</span>
                    {c.description && <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '4px 0 0' }}>{c.description}</p>}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--teal-600)', fontSize: 15 }}>{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₾${c.discountValue}`}</span>
                    <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>{c.discountType}</p>
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--slate-800)' }}>{c.usedCount}</td>
                  <td style={{ padding: '14px 18px', color: 'var(--slate-500)' }}>{c.usageLimit ?? <span style={{ color: 'var(--slate-200)', fontWeight: 700 }}>∞</span>}</td>
                  <td style={{ padding: '14px 18px', fontSize: 12 }}>
                    {c.expiresAt ? (
                      <span style={{ color: new Date(c.expiresAt) < new Date() ? 'var(--red-500)' : 'var(--slate-500)' }}>
                        {new Date(c.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    ) : <span style={{ color: 'var(--slate-200)' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...(c.isActive ? { background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' } : { background: 'var(--slate-100)', color: 'var(--slate-400)', border: '1px solid var(--slate-200)' }) }}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleActive(c.id, c.isActive)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, background: c.isActive ? 'var(--slate-100)' : 'var(--green-50)', color: c.isActive ? 'var(--slate-500)' : 'var(--green-800)' }}>
                        {c.isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button onClick={() => remove(c.id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
