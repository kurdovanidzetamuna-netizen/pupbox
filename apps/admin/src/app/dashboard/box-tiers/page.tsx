'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import FormField, { inputClass } from '@/components/FormField';
import LangTabs, { type Lang } from '@/components/LangTabs';
import { ActionButton, StatCard, StatCards, Toolbar } from '@/components/Toolbar';
import { del, getOr, post, put } from '@/lib/api';

const gel = (n: any) => `₾${Number(n).toFixed(Number(n) % 1 ? 2 : 0)}`;

const EMPTY = {
  name: '', slug: '', tagline: '', description: '', highlights: '', itemCount: 5, budgetMin: '', budgetMax: '',
  emoji: '📦', featured: false, isActive: true, sortOrder: 0,
  ka: { name: '', tagline: '', description: '', highlights: '' },
};

/**
 * Box types — Mini, Standard, Premium. Each is a kind of monthly box (how
 * many items, what the products may cost us); its plans set the length and
 * price. The grid shows every box type against every length any plan uses
 * (1, 3, 6 months to start), so a missing plan is easy to spot; "+ Add" opens
 * a new plan with that box type and length already filled in.
 */
export default function BoxTiersPage() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setTiers(await getOr<any[]>('/admin/box-tiers', []));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function open(t?: any) {
    setError(''); setLang('en');
    setEdit(t ? {
      ...EMPTY, ...t,
      highlights: (t.highlights || []).join('\n'),
      budgetMin: t.budgetMin ?? '', budgetMax: t.budgetMax ?? '',
      ka: { ...EMPTY.ka, ...(t.translations?.ka || {}), highlights: (t.translations?.ka?.highlights || []).join('\n') },
    } : { ...EMPTY, sortOrder: tiers.length + 1 });
  }

  async function save() {
    if (!edit.name.trim() || !edit.slug.trim()) { setError('Name and web name are needed'); return; }
    setSaving(true); setError('');
    const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
    const body = {
      name: edit.name.trim(), slug: edit.slug.trim(), tagline: edit.tagline, description: edit.description,
      highlights: lines(edit.highlights), itemCount: Number(edit.itemCount),
      budgetMin: edit.budgetMin === '' ? null : Number(edit.budgetMin), budgetMax: edit.budgetMax === '' ? null : Number(edit.budgetMax),
      emoji: edit.emoji, featured: edit.featured, isActive: edit.isActive, sortOrder: Number(edit.sortOrder),
      translations: { ...(edit.translations || {}), ka: { ...edit.ka, highlights: lines(edit.ka.highlights) } },
    };
    try { await (edit.id ? put(`/admin/box-tiers/${edit.id}`, body) : post('/admin/box-tiers', body)); }
    catch (e: any) { const m = e.body?.message; setError(Array.isArray(m) ? m.join(', ') : m || 'Save failed'); return; }
    finally { setSaving(false); }
    setEdit(null); load();
  }

  async function remove(t: any) {
    if (!confirm(`Delete "${t.name}"?`)) return;
    try { await del(`/admin/box-tiers/${t.id}`); } catch (e: any) { alert(e.body?.message || 'Could not delete'); return; }
    load();
  }

  const set = (k: string, v: any) => setEdit((e: any) => ({ ...e, [k]: v }));
  const setKa = (k: string, v: any) => setEdit((e: any) => ({ ...e, ka: { ...e.ka, [k]: v } }));
  // Every length in use across the box types, so a new 12-month plan gets its own column.
  const LENGTHS = [...new Set([...tiers.flatMap((t) => t.plans.map((p: any) => Number(p.durationValue))), ...(tiers.some((t) => t.plans.length) ? [] : [1, 3, 6])])].sort((a, b) => a - b);
  const addHref = (t: any, m: number) => `/dashboard/subscription-plans?new=1&tier=${t.id}&months=${m}`;
  const subs = tiers.reduce((n, t) => n + (t.subscribers || 0), 0);
  const priced = tiers.reduce((n, t) => n + LENGTHS.filter((m) => t.plans.some((p: any) => p.durationValue === m && p.isActive)).length, 0);

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)', maxWidth: 1200 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 4px' }}>Box types</h1>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0 }}>Mini, Standard, Premium — what goes in each box. Prices and lengths live on each plan.</p>
      </div>

      <StatCards>
        <StatCard value={tiers.filter((t) => t.isActive).length} label="Box types on sale" theme="teal" />
        <StatCard value={`${priced}/${tiers.length * LENGTHS.length}`} label={`${LENGTHS.join('/')}-month plans set`} theme="blue" />
        <StatCard value={subs} label="Active subscribers" theme="purple" />
      </StatCards>

      <Toolbar style={{ margin: '20px 0' }}>
        <ActionButton onClick={() => open()}>+ New box type</ActionButton>
        <Link href="/dashboard/subscription-plans" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-700)', textDecoration: 'none', alignSelf: 'center' }}>Plans →</Link>
      </Toolbar>

      {loading ? <p style={{ color: 'var(--slate-400)' }}>Loading…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
          {tiers.map((t) => (
            <div key={t.id} style={{ background: 'var(--white)', border: `1.5px solid ${t.featured ? 'var(--teal-300)' : 'var(--slate-200)'}`, borderRadius: 16, padding: 18, opacity: t.isActive ? 1 : 0.65 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--teal-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{t.emoji || '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 16, color: 'var(--slate-900)' }}>{t.name}</strong>
                    {t.translations?.ka?.name && <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>{t.translations.ka.name}</span>}
                    {t.featured && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--teal-50)', color: 'var(--teal-700)' }}>Most chosen</span>}
                    {!t.isActive && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--slate-100)', color: 'var(--slate-500)' }}>Off</span>}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '2px 0 0' }}>{t.tagline || '—'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, margin: '14px 0', fontSize: 12, color: 'var(--slate-500)', flexWrap: 'wrap' }}>
                <span><strong style={{ color: 'var(--slate-800)' }}>{t.itemCount}</strong> items</span>
                <span>Budget <strong style={{ color: 'var(--slate-800)' }}>{t.budgetMin != null ? `${gel(t.budgetMin)}–${gel(t.budgetMax ?? t.budgetMin)}` : '—'}</strong></span>
                <span><strong style={{ color: 'var(--slate-800)' }}>{t.subscribers}</strong> subscribers</span>
              </div>

              {/* 1 / 3 / 6 months: the plan's monthly price, or a gap to fill */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(LENGTHS.length, 4)}, 1fr)`, gap: 6 }}>
                {LENGTHS.map((m) => {
                  const p = t.plans.find((x: any) => x.durationValue === m);
                  return p ? (
                    <div key={m} style={{ borderRadius: 10, background: p.isActive ? 'var(--slate-50)' : 'var(--white)', border: '1px solid var(--slate-200)', padding: '8px 10px', opacity: p.isActive ? 1 : 0.6 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--slate-400)' }}>{m} mo{!p.isActive ? ' · off' : p.listed === false ? ' · hidden' : ''}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--slate-900)' }}>{gel(p.monthlyEquivPrice ?? Number(p.price) / m)}<span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--slate-400)' }}>/mo</span></div>
                      <div style={{ fontSize: 10.5, color: 'var(--slate-500)' }}>{gel(p.price)}{Number(p.discountPercent) > 0 ? ` · −${Number(p.discountPercent)}%` : ''}</div>
                    </div>
                  ) : (
                    <Link key={m} href={addHref(t, m)} title={`New ${t.name} plan for ${m} month${m === 1 ? '' : 's'}`}
                      style={{ borderRadius: 10, border: '1.5px dashed var(--slate-300)', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ fontSize: 10.5, color: 'var(--slate-400)' }}>{m} mo</span>+ Add
                    </Link>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <ActionButton variant="secondary" onClick={() => open(t)}>Edit</ActionButton>
                {t.plans.length === 0 && <ActionButton variant="secondary" onClick={() => remove(t)} style={{ color: 'var(--red-600)' }}>Delete</ActionButton>}
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <div role="dialog" aria-modal="true" aria-label={edit.id ? `Edit ${edit.name}` : 'New box type'} onClick={() => setEdit(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{edit.id ? `Edit ${edit.name}` : 'New box type'}</h2>
              <LangTabs lang={lang} onChange={setLang} />
            </div>

            {lang === 'en' ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: 10 }}>
                  <FormField label="Icon"><input value={edit.emoji} onChange={(e) => set('emoji', e.target.value)} style={{ ...inputClass(), textAlign: 'center', fontSize: 18 }} /></FormField>
                  <FormField label="Name" required><input value={edit.name} onChange={(e) => set('name', e.target.value)} placeholder="Standard" style={inputClass()} /></FormField>
                  <FormField label="Web name" required hint="lowercase-with-dashes"><input value={edit.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="standard" style={inputClass()} /></FormField>
                </div>
                <FormField label="Tagline" hint="One short line under the name"><input value={edit.tagline} onChange={(e) => set('tagline', e.target.value)} style={inputClass()} /></FormField>
                <FormField label="Description"><textarea value={edit.description} onChange={(e) => set('description', e.target.value)} rows={2} style={inputClass()} /></FormField>
                <FormField label="What's special" hint="One per line — shown as ticks on the card"><textarea value={edit.highlights} onChange={(e) => set('highlights', e.target.value)} rows={3} style={inputClass()} /></FormField>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <FormField label="Items" required><input type="text" inputMode="numeric" value={edit.itemCount} onChange={(e) => set('itemCount', e.target.value.replace(/\D/g, ''))} style={inputClass()} /></FormField>
                  <FormField label="Budget from ₾"><input type="text" inputMode="decimal" value={edit.budgetMin} onChange={(e) => set('budgetMin', e.target.value.replace(/[^\d.]/g, ''))} style={inputClass()} /></FormField>
                  <FormField label="to ₾"><input type="text" inputMode="decimal" value={edit.budgetMax} onChange={(e) => set('budgetMax', e.target.value.replace(/[^\d.]/g, ''))} style={inputClass()} /></FormField>
                  <FormField label="Order"><input type="text" inputMode="numeric" value={edit.sortOrder} onChange={(e) => set('sortOrder', e.target.value.replace(/\D/g, ''))} style={inputClass()} /></FormField>
                </div>
                <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '-4px 0 0' }}>Budget: what one box's products may cost us, without VAT. Only admin sees it.</p>
                <div style={{ display: 'flex', gap: 18, fontSize: 13 }}>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={edit.featured} onChange={(e) => set('featured', e.target.checked)} /> Mark as most chosen</label>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={edit.isActive} onChange={(e) => set('isActive', e.target.checked)} /> On sale</label>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                <FormField label="სახელი"><input value={edit.ka.name} onChange={(e) => setKa('name', e.target.value)} placeholder="სტანდარტი" style={inputClass()} /></FormField>
                <FormField label="მოკლე აღწერა"><input value={edit.ka.tagline} onChange={(e) => setKa('tagline', e.target.value)} style={inputClass()} /></FormField>
                <FormField label="აღწერა"><textarea value={edit.ka.description} onChange={(e) => setKa('description', e.target.value)} rows={2} style={inputClass()} /></FormField>
                <FormField label="რით გამოირჩევა" hint="თითო ხაზზე ერთი"><textarea value={edit.ka.highlights} onChange={(e) => setKa('highlights', e.target.value)} rows={3} style={inputClass()} /></FormField>
              </div>
            )}

            {error && <p role="alert" style={{ color: 'var(--red-600)', fontSize: 12.5, margin: '12px 0 0' }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <ActionButton variant="secondary" onClick={() => setEdit(null)}>Cancel</ActionButton>
              <ActionButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
