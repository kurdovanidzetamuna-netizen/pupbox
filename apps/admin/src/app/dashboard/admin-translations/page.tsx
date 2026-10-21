'use client';
import { Select } from '@/components/Dropdown';
import { useEffect, useState } from 'react';
import { ActionButton, RowActions } from '../../../components/Toolbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function exportCsv(rows: string[][], filename: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = rows.map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const SECTIONS = [
  { key: 'nav',        label: 'Navigation',        icon: '🗂️' },
  { key: 'dashboard',  label: 'Dashboard',          icon: '📊' },
  { key: 'products',   label: 'Products',           icon: '📦' },
  { key: 'orders',     label: 'Orders',             icon: '🛒' },
  { key: 'plans',      label: 'Subscription Plans', icon: '📋' },
  { key: 'customers',  label: 'Customers',          icon: '👥' },
  { key: 'common',     label: 'Common / Shared',    icon: '🌐' },
];

interface Translation {
  id: string;
  key: string;
  en: string;
  ka: string;
  section: string;
}

const EMPTY_FORM: Omit<Translation, 'id'> = { key: '', en: '', ka: '', section: 'common' };

function genId() { return Math.random().toString(36).slice(2, 10); }

const SEED: Omit<Translation, 'id'>[] = [
  // Navigation
  { key: 'nav.overview',          en: 'Overview',              ka: 'მიმოხილვა',          section: 'nav' },
  { key: 'nav.dashboard',         en: 'Dashboard',             ka: 'დაფა',                section: 'nav' },
  { key: 'nav.reports',           en: 'Reports',               ka: 'ანგარიშები',          section: 'nav' },
  { key: 'nav.subscriptions',     en: 'Subscriptions',         ka: 'გამოწერები',          section: 'nav' },
  { key: 'nav.plans',             en: 'Plans',                 ka: 'გეგმები',             section: 'nav' },
  { key: 'nav.boxItems',          en: 'Box Items',             ka: 'კოლოფის პროდუქტები', section: 'nav' },
  { key: 'nav.orders',            en: 'Orders',                ka: 'შეკვეთები',           section: 'nav' },
  { key: 'nav.products',          en: 'Products',              ka: 'პროდუქტები',          section: 'nav' },
  { key: 'nav.categories',        en: 'Categories',            ka: 'კატეგორიები',         section: 'nav' },
  { key: 'nav.customers',         en: 'Customers',             ka: 'კლიენტები',           section: 'nav' },
  { key: 'nav.signOut',           en: 'Sign Out',              ka: 'გასვლა',              section: 'nav' },

  // Dashboard
  { key: 'dashboard.title',       en: 'Dashboard',             ka: 'მართვის პანელი',      section: 'dashboard' },
  { key: 'dashboard.welcome',     en: 'Welcome back',          ka: 'კეთილი დაბრუნება',   section: 'dashboard' },
  { key: 'dashboard.totalOrders', en: 'Total Orders',          ka: 'სულ შეკვეთები',      section: 'dashboard' },
  { key: 'dashboard.revenue',     en: 'Revenue',               ka: 'შემოსავალი',          section: 'dashboard' },
  { key: 'dashboard.subscribers', en: 'Active Subscribers',    ka: 'აქტიური გამომწერები', section: 'dashboard' },
  { key: 'dashboard.newToday',    en: 'New Today',             ka: 'დღეს ახალი',          section: 'dashboard' },

  // Products
  { key: 'products.title',        en: 'Products',              ka: 'პროდუქტები',          section: 'products' },
  { key: 'products.newProduct',   en: 'New Product',           ka: 'ახალი პროდუქტი',     section: 'products' },
  { key: 'products.newBoxItem',   en: 'New Box Item',          ka: 'ახალი კოლოფის პროდუქტი', section: 'products' },
  { key: 'products.name',         en: 'Product Name',          ka: 'პროდუქტის სახელი',   section: 'products' },
  { key: 'products.sku',          en: 'SKU',                   ka: 'SKU',                 section: 'products' },
  { key: 'products.price',        en: 'Price',                 ka: 'ფასი',                section: 'products' },
  { key: 'products.stock',        en: 'Stock',                 ka: 'მარაგი',              section: 'products' },
  { key: 'products.category',     en: 'Category',              ka: 'კატეგორია',           section: 'products' },
  { key: 'products.status',       en: 'Status',                ka: 'სტატუსი',             section: 'products' },
  { key: 'products.brand',        en: 'Brand',                 ka: 'ბრენდი',              section: 'products' },
  { key: 'products.description',  en: 'Description',           ka: 'აღწერა',              section: 'products' },
  { key: 'products.active',       en: 'Active',                ka: 'აქტიური',             section: 'products' },
  { key: 'products.inactive',     en: 'Inactive',              ka: 'არააქტიური',          section: 'products' },
  { key: 'products.draft',        en: 'Draft',                 ka: 'მონახაზი',            section: 'products' },
  { key: 'products.outOfStock',   en: 'Out of Stock',          ka: 'ამოიწურა',            section: 'products' },

  // Orders
  { key: 'orders.title',          en: 'Orders',                ka: 'შეკვეთები',           section: 'orders' },
  { key: 'orders.orderId',        en: 'Order ID',              ka: 'შეკვეთის ID',         section: 'orders' },
  { key: 'orders.customer',       en: 'Customer',              ka: 'კლიენტი',             section: 'orders' },
  { key: 'orders.total',          en: 'Total',                 ka: 'სულ',                 section: 'orders' },
  { key: 'orders.status',         en: 'Status',                ka: 'სტატუსი',             section: 'orders' },
  { key: 'orders.date',           en: 'Date',                  ka: 'თარიღი',              section: 'orders' },
  { key: 'orders.pending',        en: 'Pending',               ka: 'მოლოდინში',           section: 'orders' },
  { key: 'orders.processing',     en: 'Processing',            ka: 'მუშავდება',           section: 'orders' },
  { key: 'orders.shipped',        en: 'Shipped',               ka: 'გაგზავნილია',         section: 'orders' },
  { key: 'orders.delivered',      en: 'Delivered',             ka: 'მიტანილია',           section: 'orders' },
  { key: 'orders.cancelled',      en: 'Cancelled',             ka: 'გაუქმებულია',         section: 'orders' },

  // Subscription Plans
  { key: 'plans.title',           en: 'Subscription Plans',    ka: 'გამოწერის გეგმები',   section: 'plans' },
  { key: 'plans.newPlan',         en: 'New Plan',              ka: 'ახალი გეგმა',         section: 'plans' },
  { key: 'plans.configure',       en: 'Configure',             ka: 'კონფიგურაცია',        section: 'plans' },
  { key: 'plans.boxBuilder',      en: 'Box Builder',           ka: 'კოლოფის შემქმნელი',   section: 'plans' },
  { key: 'plans.planSettings',    en: 'Plan Settings',         ka: 'გეგმის პარამეტრები',  section: 'plans' },
  { key: 'plans.discounts',       en: 'Discounts',             ka: 'ფასდაკლებები',        section: 'plans' },
  { key: 'plans.duration',        en: 'Duration',              ka: 'ხანგრძლივობა',        section: 'plans' },
  { key: 'plans.boxes',           en: 'Boxes',                 ka: 'კოლოფები',            section: 'plans' },
  { key: 'plans.live',            en: 'Live',                  ka: 'აქტიური',             section: 'plans' },
  { key: 'plans.disabled',        en: 'Disabled',              ka: 'გამორთული',           section: 'plans' },

  // Customers
  { key: 'customers.title',       en: 'Customers',             ka: 'კლიენტები',           section: 'customers' },
  { key: 'customers.name',        en: 'Name',                  ka: 'სახელი',              section: 'customers' },
  { key: 'customers.email',       en: 'Email',                 ka: 'ელ. ფოსტა',           section: 'customers' },
  { key: 'customers.phone',       en: 'Phone',                 ka: 'ტელეფონი',            section: 'customers' },
  { key: 'customers.joinDate',    en: 'Join Date',             ka: 'რეგისტრაციის თარიღი', section: 'customers' },
  { key: 'customers.active',      en: 'Active',                ka: 'აქტიური',             section: 'customers' },

  // Common
  { key: 'common.save',           en: 'Save',                  ka: 'შენახვა',             section: 'common' },
  { key: 'common.saveAll',        en: 'Save All',              ka: 'ყველის შენახვა',      section: 'common' },
  { key: 'common.cancel',         en: 'Cancel',                ka: 'გაუქმება',            section: 'common' },
  { key: 'common.delete',         en: 'Delete',                ka: 'წაშლა',               section: 'common' },
  { key: 'common.edit',           en: 'Edit',                  ka: 'რედაქტირება',         section: 'common' },
  { key: 'common.add',            en: 'Add',                   ka: 'დამატება',            section: 'common' },
  { key: 'common.search',         en: 'Search',                ka: 'ძიება',               section: 'common' },
  { key: 'common.filter',         en: 'Filter',                ka: 'ფილტრი',              section: 'common' },
  { key: 'common.loading',        en: 'Loading…',              ka: 'იტვირთება…',          section: 'common' },
  { key: 'common.noResults',      en: 'No results found',      ka: 'შედეგი არ მოიძებნა',  section: 'common' },
  { key: 'common.actions',        en: 'Actions',               ka: 'მოქმედებები',         section: 'common' },
  { key: 'common.status',         en: 'Status',                ka: 'სტატუსი',             section: 'common' },
  { key: 'common.enable',         en: 'Enable',                ka: 'ჩართვა',              section: 'common' },
  { key: 'common.disable',        en: 'Disable',               ka: 'გამორთვა',            section: 'common' },
  { key: 'common.close',          en: 'Close',                 ka: 'დახურვა',             section: 'common' },
  { key: 'common.confirm',        en: 'Confirm',               ka: 'დადასტურება',         section: 'common' },
  { key: 'common.required',       en: 'Required',              ka: 'სავალდებულო',         section: 'common' },
  { key: 'common.optional',       en: 'Optional',              ka: 'არასავალდებულო',      section: 'common' },
  { key: 'common.yes',            en: 'Yes',                   ka: 'დიახ',                section: 'common' },
  { key: 'common.no',             en: 'No',                    ka: 'არა',                 section: 'common' },
  { key: 'common.view',           en: 'View',                  ka: 'ნახვა',               section: 'common' },
  { key: 'common.back',           en: 'Back',                  ka: 'უკან',                section: 'common' },
  { key: 'common.export',         en: 'Export',                ka: 'ექსპორტი',            section: 'common' },
];

// ── Controlled inline-edit row ──────────────────────────────────────────────
function AdminTranslationRow({ s, onSave, onEdit, onDelete }: {
  s: Translation;
  onSave: (id: string, en: string, ka: string) => void;
  onEdit: (s: Translation) => void;
  onDelete: (id: string) => void;
}) {
  const sec = SECTIONS.find(x => x.key === s.section);
  const [en, setEn] = useState(s.en);
  const [ka, setKa] = useState(s.ka);
  const [focused, setFocused] = useState(false);

  useEffect(() => { setEn(s.en); }, [s.en]);
  useEffect(() => { setKa(s.ka); }, [s.ka]);

  const dirty = en !== s.en || ka !== s.ka;
  const showSave = dirty || focused;
  const canSave = en.trim() !== '' && ka.trim() !== '';
  const missingKa = !s.ka.trim();

  const inputStyle = (missing: boolean): React.CSSProperties => ({
    width: '100%', padding: '5px 9px', fontSize: 13,
    border: `1px solid ${missing ? 'var(--red-300)' : 'var(--slate-200)'}`, borderRadius: 7,
    outline: 'none', background: missing ? 'var(--red-50b)' : 'var(--slate-50)',
    color: 'var(--slate-900)', boxSizing: 'border-box',
  });

  return (
    <tr style={{ borderBottom: '1px solid var(--slate-100)', background: missingKa ? 'var(--amber-50b)' : 'transparent' }}>
      <td style={{ padding: '10px 16px', maxWidth: 180 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '2px 7px', borderRadius: 5, wordBreak: 'break-all', display: 'inline-block' }}>{s.key}</span>
      </td>
      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--teal-50)', color: 'var(--teal-600)', border: '1px solid var(--teal-200)', borderRadius: 6, padding: '2px 8px' }}>{sec?.icon} {sec?.label || s.section}</span>
      </td>
      <td style={{ padding: '6px 16px', minWidth: 180 }}>
        <input value={en} onChange={e => setEn(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="English text…" style={inputStyle(false)} />
      </td>
      <td style={{ padding: '6px 16px', minWidth: 180 }}>
        <input value={ka} onChange={e => setKa(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={missingKa ? '⚠ Missing Georgian…' : ''} style={inputStyle(missingKa && !ka.trim())} />
      </td>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {showSave && (
            <ActionButton onClick={() => { if (canSave) onSave(s.id, en, ka); }} disabled={!canSave} style={{ padding: '4px 10px', fontSize: 12, background: canSave ? 'var(--teal-600)' : 'var(--slate-200)', color: canSave ? 'var(--white)' : 'var(--slate-400)' }}>
              Save
            </ActionButton>
          )}
          {dirty && (
            <ActionButton variant="secondary" onClick={() => { setEn(s.en); setKa(s.ka); }} style={{ padding: '4px 10px', fontSize: 12 }}>
              ×
            </ActionButton>
          )}
          <ActionButton variant="secondary" onClick={() => onEdit(s)} style={{ padding: '4px 10px', fontSize: 12 }}>Edit</ActionButton>
          <RowActions onDelete={() => onDelete(s.id)} canDelete={true} />
        </div>
      </td>
    </tr>
  );
}

export default function AdminTranslationsPage() {
  const [strings, setStrings] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [sectionFilter, setSectionFilter] = useState('all');

  const [search, setSearch] = useState('');
  const [showMissing, setShowMissing] = useState(false);

  const [modal, setModal] = useState<null | 'add' | 'edit'>(null);
  const [form, setForm] = useState<Omit<Translation, 'id'>>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const token = () => localStorage.getItem('admin_token');

  useEffect(() => {
    fetch(`${API}/cms/admin/admin-ui-translations`, { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const existing: Translation[] = data?.content?.strings || [];
        setStrings(existing.length > 0 ? existing : SEED.map(s => ({ ...s, id: genId() })));
      })
      .catch(() => setStrings(SEED.map(s => ({ ...s, id: genId() }))))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setModal(null); setDeleteId(null); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  async function persist(next: Translation[]) {
    setSaving(true);
    try {
      await fetch(`${API}/cms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ key: 'admin-ui-translations', slug: 'admin-ui-translations', title: 'Admin UI Translations', status: 'PUBLISHED', content: { strings: next } }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  function saveInline(id: string, en: string, ka: string) {
    const next = strings.map(s => s.id === id ? { ...s, en, ka } : s);
    setStrings(next);
    persist(next);
  }

  function saveModal() {
    let next: Translation[];
    if (modal === 'edit' && editId) {
      next = strings.map(s => s.id === editId ? { ...s, ...form } : s);
    } else {
      next = [...strings, { ...form, id: genId() }];
    }
    setStrings(next);
    persist(next);
    setModal(null);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  function openEdit(s: Translation) {
    setForm({ key: s.key, en: s.en, ka: s.ka, section: s.section });
    setEditId(s.id);
    setModal('edit');
  }

  function confirmDelete() {
    if (!deleteId) return;
    const next = strings.filter(s => s.id !== deleteId);
    setStrings(next);
    persist(next);
    setDeleteId(null);
  }

  const displayed = strings.filter(s => {
    if (sectionFilter !== 'all' && s.section !== sectionFilter) return false;
    if (showMissing && s.ka.trim()) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.key.toLowerCase().includes(q) || s.en.toLowerCase().includes(q) || s.ka.toLowerCase().includes(q);
    }
    return true;
  });

  const missing = strings.filter(s => !s.ka.trim()).length;
  const coverage = strings.length ? Math.round(((strings.length - missing) / strings.length) * 100) : 100;

  const inp: React.CSSProperties = { width: '100%', padding: '8px 11px', fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 9, outline: 'none', background: 'var(--white)', boxSizing: 'border-box', color: 'var(--slate-900)' };

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 4px' }}>Admin Panel Translations</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0 }}>Manage English and Georgian strings for the admin panel UI. Separate from the customer-facing site translations.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saving && <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Saving…</span>}
          {saved && <span style={{ fontSize: 12, color: 'var(--emerald-500)', fontWeight: 600 }}>✓ Saved</span>}
          <ActionButton variant="secondary" onClick={() => {
            const sec = (id: string) => SECTIONS.find(s => s.key === id)?.label || id;
            const rows: string[][] = [['Key', 'Section', 'English', 'Georgian']];
            strings.forEach(s => rows.push([s.key, sec(s.section), s.en, s.ka]));
            exportCsv(rows, 'admin-translations.csv');
          }}>↓ Export CSV</ActionButton>
          <ActionButton onClick={() => { setForm(EMPTY_FORM); setEditId(null); setModal('add'); }}>+ Add String</ActionButton>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total strings', value: strings.length, color: 'var(--slate-900)' },
          { label: 'Translated (KA)', value: strings.length - missing, color: 'var(--green-600)' },
          { label: 'Missing Georgian', value: missing, color: missing > 0 ? 'var(--red-600)' : 'var(--green-600)' },
          { label: 'Coverage', value: `${coverage}%`, color: coverage === 100 ? 'var(--green-600)' : coverage >= 80 ? 'var(--amber-700)' : 'var(--red-600)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--slate-200b)', padding: '16px 20px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[{ key: 'all', label: 'All', icon: '🌐' }, ...SECTIONS].map(s => (
            <button key={s.key} onClick={() => setSectionFilter(s.key)}
              style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: sectionFilter === s.key ? 'var(--teal-600)' : 'var(--slate-100)', color: sectionFilter === s.key ? 'var(--white)' : 'var(--slate-500)', transition: 'all 0.12s' }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowMissing(m => !m)}
          style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${showMissing ? 'var(--red-600)' : 'var(--slate-200)'}`, background: showMissing ? 'var(--red-50)' : 'var(--white)', color: showMissing ? 'var(--red-600)' : 'var(--slate-500)' }}>
          ⚠ Missing only {missing > 0 && `(${missing})`}
        </button>
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--slate-400)', pointerEvents: 'none' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search keys, English, Georgian…"
            style={{ paddingLeft: 30, paddingRight: search ? 28 : 10, paddingTop: 7, paddingBottom: 7, fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 9, outline: 'none', width: 240, background: 'var(--white)', color: 'var(--slate-900)' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--slate-400)', padding: 0 }}>×</button>}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🌐</div>
            <p style={{ fontSize: 13 }}>No strings match your filters</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Key', 'Section', '🇬🇧 English', '🇬🇪 Georgian', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(s => (
                <AdminTranslationRow key={s.id} s={s} onSave={saveInline} onEdit={openEdit} onDelete={id => setDeleteId(id)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <div onClick={() => { setModal(null); setEditId(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--slate-900)' }}>{modal === 'add' ? 'Add String' : 'Edit String'}</h2>
              <button onClick={() => { setModal(null); setEditId(null); }} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, color: 'var(--slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 5, display: 'block' }}>Section</label>
                <Select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} style={{ ...inp }}>
                  {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                </Select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 5, display: 'block' }}>Key <span style={{ color: 'var(--red-600)' }}>*</span></label>
                <input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} placeholder="e.g. common.save" style={{ ...inp, fontFamily: 'monospace' }} />
                <p style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 3 }}>Use dot notation: section.subkey</p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>🇬🇧 English <span style={{ color: 'var(--red-600)' }}>*</span></label>
                <input value={form.en} onChange={e => setForm(f => ({ ...f, en: e.target.value }))} placeholder="English text" style={{ ...inp }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>🇬🇪 Georgian <span style={{ color: 'var(--red-600)' }}>*</span></label>
                <input value={form.ka} onChange={e => setForm(f => ({ ...f, ka: e.target.value }))} placeholder="Georgian text" style={{ ...inp }} />
              </div>
            </div>
            <div style={{ padding: '14px 28px', borderTop: '1px solid var(--slate-200)', display: 'flex', gap: 10 }}>
              <ActionButton onClick={saveModal} disabled={!form.key.trim() || !form.en.trim() || !form.ka.trim()} style={{ flex: 2, padding: '10px 0', justifyContent: 'center' }}>
                {modal === 'add' ? 'Add String' : 'Save Changes'}
              </ActionButton>
              <ActionButton variant="secondary" onClick={() => { setModal(null); setEditId(null); }} style={{ flex: 1, padding: '10px 0', justifyContent: 'center' }}>
                Cancel
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div onClick={() => setDeleteId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 18, width: '100%', maxWidth: 380, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', padding: '28px 28px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--slate-900)' }}>Delete this string?</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-500)' }}>
              Key: <code style={{ fontFamily: 'monospace', background: 'var(--slate-100)', padding: '1px 6px', borderRadius: 4 }}>{strings.find(s => s.id === deleteId)?.key}</code>
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--slate-400)' }}>This will permanently remove the string and both translations.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <ActionButton onClick={confirmDelete} style={{ flex: 1, padding: '10px 0', background: 'var(--red-600)', justifyContent: 'center' }}>Delete</ActionButton>
              <ActionButton variant="secondary" onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '10px 0', justifyContent: 'center' }}>Cancel</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
