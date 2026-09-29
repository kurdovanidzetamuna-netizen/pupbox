'use client';
import { useState, useEffect, useMemo } from 'react';
import FormField, { inputClass } from '@/components/FormField';
import LangTabs, { type Lang } from '@/components/LangTabs';
import { ActionButton, SortBar, ViewToggle, Toolbar, StatCard, StatCards, PlanHighlightCard, FilterSelect, CustomSelect, RowActions, Pagination, type ViewMode } from '@/components/Toolbar';
import QuickAddBoxItemModal from '@/components/QuickAddBoxItemModal';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const EMPTY_FORM = {
  name: '', slug: '', durationValue: 1, durationUnit: 'MONTH', boxCount: 1,
  monthlyPrice: '', discountPercent: '',
  deliveryIncluded: true, autoRenewal: true, description: '', benefits: '',
  badge: '', isActive: true, sortOrder: 0,
};
const EMPTY_KA = { name: '', description: '', benefits: '' };
type PlanItem = { productId: string; name: string; price: number; qty: number };
type BoxConfig = { items: PlanItem[] };
type GiftBox = { id: string; label: string; description: string; items: PlanItem[] };

const EMPTY_CONFIG = {
  boxes: [] as BoxConfig[],
  giftBoxes: [] as GiftBox[],
  operationalCost: 0,
  deliveryCost: 0,
  deliveryFree: true,
  couponIds: [] as string[],
  referralDiscountPercent: 0,
};

function migrateConfig(saved: any, boxCount: number): typeof EMPTY_CONFIG {
  const base = { ...EMPTY_CONFIG };
  if (!saved) return { ...base, boxes: Array.from({ length: boxCount }, () => ({ items: [] })) };
  const legacyItems: PlanItem[] = saved.planItems || [];
  const rawBoxes: BoxConfig[] = saved.boxes || [];
  const boxes: BoxConfig[] = Array.from({ length: boxCount }, (_, i) => ({
    items: rawBoxes[i]?.items ?? (i === 0 ? legacyItems : []),
  }));
  return { ...base, ...saved, boxes, giftBoxes: saved.giftBoxes || [] };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function num(v: any, fallback = 0) { const n = parseFloat(v); return isNaN(n) ? fallback : n; }

function Pill({ bg, color, border, children }: any) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color, border }}>{children}</span>;
}

// ── Plan Builder (right-side drawer) ─────────────────────────────────────────

function PlanBuilder({ plan, onClose, onSaved, badges, setBadges }: { plan: any; onClose: () => void; onSaved: () => void; badges: string[]; setBadges: (b: string[]) => void }) {
  const token = () => localStorage.getItem('admin_token');
  const [tab, setTab] = useState<'builder' | 'form' | 'discounts'>('form');
  const [boxItems, setBoxItems] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const DEFAULT_BADGES = PAGE_DEFAULT_BADGES;
  const [showNewBadge, setShowNewBadge] = useState(false);
  const [newBadgeInput, setNewBadgeInput] = useState('');

  // Reverse-compute monthlyPrice from stored price + duration + discount when loading an existing plan
  const initMonthlyPrice = (() => {
    const storedPrice = Number(plan.price);
    const months = Number(plan.durationValue) || 1;
    const disc = Number(plan.discountPercent) || 0;
    if (!storedPrice) return '';
    const base = disc > 0 ? storedPrice / ((1 - disc / 100) * months) : storedPrice / months;
    return String(Math.round(base * 100) / 100);
  })();

  // form state
  const [form, setForm] = useState<any>({
    ...EMPTY_FORM,
    ...plan,
    benefits: (plan.benefits || []).join('\n'),
    discountPercent: plan.discountPercent || '',
    monthlyPrice: initMonthlyPrice,
  });
  const [ka, setKa] = useState<any>(() => {
    const d = plan.translations?.ka;
    return d ? { name: d.name || '', description: d.description || '', benefits: (d.benefits || []).join('\n') } : { ...EMPTY_KA };
  });

  const boxCount = Number(form.boxCount) || 1;

  // ── Pricing calculations ──────────────────────────────────────────────────
  const pricingMonths = Number(form.durationValue) || 1;
  const pricingMonthly = Number(form.monthlyPrice) || 0;
  const pricingDiscount = Math.min(Math.max(Number(form.discountPercent) || 0, 0), 100);
  const pricingTotal = pricingMonthly * pricingMonths * (1 - pricingDiscount / 100);
  const pricingEffectiveMonthly = pricingMonths > 0 ? pricingTotal / pricingMonths : 0;
  const pricingSavings = pricingMonthly * pricingMonths - pricingTotal;

  // builder state — loaded from translations.config
  const [cfg, setCfg] = useState<typeof EMPTY_CONFIG>(() =>
    migrateConfig(plan.translations?.config, Number(plan.boxCount) || 1)
  );
  const [activeBox, setActiveBox] = useState(0);
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [showNewBoxItemDrawer, setShowNewBoxItemDrawer] = useState(false);
  const [giftSearch, setGiftSearch] = useState<Record<string, string>>({});
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Track initial state to detect unsaved changes
  const initForm = JSON.stringify({ ...EMPTY_FORM, ...plan, benefits: (plan.benefits || []).join('\n'), discountPercent: plan.discountPercent || '', monthlyPrice: initMonthlyPrice });
  const initCfg = JSON.stringify(migrateConfig(plan.translations?.config, Number(plan.boxCount) || 1));
  const isDirty = JSON.stringify(form) !== initForm || JSON.stringify(cfg) !== initCfg;

  function tryClose() {
    if (isDirty) { setShowCloseConfirm(true); } else { onClose(); }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (showNewBoxItemDrawer) return; e.stopImmediatePropagation(); tryClose(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [isDirty, showNewBoxItemDrawer]);

  function loadBoxItems() {
    fetch(`${API}/admin/products?includedInBox=true&limit=200`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(prod => setBoxItems(prod.items || []));
  }

  useEffect(() => {
    Promise.all([
      fetch(`${API}/admin/products?includedInBox=true&limit=200`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json() : { items: [] }),
      fetch(`${API}/admin/coupons`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([prod, coup]) => {
      setBoxItems(prod.items || []);
      setCoupons(Array.isArray(coup) ? coup.filter((c: any) => c.isActive) : []);
    });
  }, []);

  // sync boxes array length when boxCount changes in the form
  const formBoxCount = Number(form.boxCount) || 1;
  const syncedCfg = useMemo(() => {
    const current = cfg.boxes || [];
    if (current.length === formBoxCount) return cfg;
    const boxes: BoxConfig[] = Array.from({ length: formBoxCount }, (_, i) => current[i] || { items: [] });
    return { ...cfg, boxes };
  }, [cfg, formBoxCount]);

  // ── cost calculations ──

  const safeActiveBox = Math.min(activeBox, (syncedCfg.boxes?.length || 1) - 1);
  const activeItems: PlanItem[] = syncedCfg.boxes?.[safeActiveBox]?.items || [];

  const boxProductTotals = useMemo(() =>
    (syncedCfg.boxes || []).map(b => b.items.reduce((s, i) => s + i.price * i.qty, 0)),
    [syncedCfg.boxes]
  );
  const activeProductTotal = boxProductTotals[safeActiveBox] || 0;
  const allProductTotal = useMemo(() => boxProductTotals.reduce((s, v) => s + v, 0), [boxProductTotals]);

  const deliveryCostEffective = cfg.deliveryFree ? 0 : num(cfg.deliveryCost);
  const perBoxOtherCost = num(cfg.operationalCost) + deliveryCostEffective;
  const activeBoxCost = activeProductTotal + perBoxOtherCost;
  const giftBoxTotal = useMemo(() =>
    (cfg.giftBoxes || []).reduce((s, g) => s + g.items.reduce((gs, i) => gs + i.price * i.qty, 0), 0),
    [cfg.giftBoxes]
  );
  const totalCost = allProductTotal + perBoxOtherCost * boxCount + giftBoxTotal;
  const sellingPrice = pricingTotal;
  const margin = sellingPrice - totalCost;
  const marginPct = totalCost > 0 ? (margin / totalCost) * 100 : sellingPrice > 0 ? 100 : 0;
  const perBoxSell = boxCount > 0 ? sellingPrice / boxCount : 0;

  // ── gift box actions ──

  function addGiftBox() {
    setCfg(c => ({
      ...c,
      giftBoxes: [...(c.giftBoxes || []), { id: `gift_${Date.now()}`, label: 'Bonus Gift Box', description: '', items: [] }],
    }));
  }

  function removeGiftBox(id: string) {
    setCfg(c => ({ ...c, giftBoxes: (c.giftBoxes || []).filter(g => g.id !== id) }));
  }

  function updateGiftBox(id: string, patch: Partial<GiftBox>) {
    setCfg(c => ({ ...c, giftBoxes: (c.giftBoxes || []).map(g => g.id === id ? { ...g, ...patch } : g) }));
  }

  function addGiftItem(giftId: string, product: any) {
    setCfg(c => ({
      ...c,
      giftBoxes: (c.giftBoxes || []).map(g =>
        g.id === giftId && !g.items.find(i => i.productId === product.id)
          ? { ...g, items: [...g.items, { productId: product.id, name: product.name, price: num(product.price), qty: 1 }] }
          : g
      ),
    }));
  }

  function removeGiftItem(giftId: string, productId: string) {
    setCfg(c => ({
      ...c,
      giftBoxes: (c.giftBoxes || []).map(g => g.id === giftId ? { ...g, items: g.items.filter(i => i.productId !== productId) } : g),
    }));
  }

  function setGiftItemQty(giftId: string, productId: string, qty: number) {
    setCfg(c => ({
      ...c,
      giftBoxes: (c.giftBoxes || []).map(g => g.id === giftId ? { ...g, items: g.items.map(i => i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i) } : g),
    }));
  }

  // ── item actions (operate on active box) ──

  function updateBox(boxIdx: number, updater: (items: PlanItem[]) => PlanItem[]) {
    setCfg(c => {
      // Ensure boxes array is at least formBoxCount long before mutating
      const existing = c.boxes || [];
      const current: BoxConfig[] = Array.from({ length: formBoxCount }, (_, i) => existing[i] || { items: [] });
      const boxes = current.map((b, i) => i === boxIdx ? { ...b, items: updater(b.items) } : b);
      return { ...c, boxes };
    });
  }

  function addItem(product: any) {
    if (activeItems.find(i => i.productId === product.id)) return;
    updateBox(safeActiveBox, items => [...items, { productId: product.id, name: product.name, price: num(product.price), qty: 1 }]);
  }

  function removeItem(productId: string) {
    updateBox(safeActiveBox, items => items.filter(i => i.productId !== productId));
  }

  function setItemQty(productId: string, qty: number) {
    updateBox(safeActiveBox, items => items.map(i => i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i));
  }

  function setItemPrice(productId: string, price: number) {
    updateBox(safeActiveBox, items => items.map(i => i.productId === productId ? { ...i, price } : i));
  }

  function toggleCoupon(id: string) {
    setCfg(c => ({
      ...c,
      couponIds: c.couponIds.includes(id) ? c.couponIds.filter(x => x !== id) : [...c.couponIds, id],
    }));
  }

  // ── save ──

  function validate() {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = 'Name is required';
    if (!form.slug?.trim()) errors.slug = 'Slug is required';
    else if (!/^[a-z0-9-]+$/.test(form.slug)) errors.slug = 'Slug must be lowercase letters, numbers and hyphens only';
    if (!form.monthlyPrice || isNaN(Number(form.monthlyPrice)) || Number(form.monthlyPrice) <= 0) errors.monthlyPrice = 'Monthly price must be a positive number';
    if (!form.boxCount || isNaN(Number(form.boxCount)) || Number(form.boxCount) < 1) errors.boxCount = 'Box count must be at least 1';
    if (!form.durationValue || isNaN(Number(form.durationValue)) || Number(form.durationValue) < 1) errors.durationValue = 'Duration value must be at least 1';
    if (!form.durationUnit) errors.durationUnit = 'Duration unit is required';
    if (!ka.name?.trim()) errors.kaName = 'Georgian name is required';
    setFormErrors(errors);
    return errors;
  }

  async function save(andClose = false) {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setTab('form');
      const hasEnErrors = Object.entries(errors).some(([k, v]) => k !== 'kaName' && v);
      if (hasEnErrors) setLang('en');
      const errorMessages = Object.values(errors).filter(Boolean);
      setToast({ msg: errorMessages.length === 1 ? errorMessages[0] : `${errorMessages.length} fields need attention — check Plan Settings`, type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const hasKa = Object.values(ka).some((v: any) => String(v).trim() !== '');
      const body: any = {
        name: form.name,
        slug: form.slug,
        durationValue: Number(form.durationValue),
        durationUnit: form.durationUnit,
        boxCount: Number(form.boxCount),
        price: Math.round(pricingTotal * 100) / 100,
        monthlyEquivPrice: Math.round(pricingEffectiveMonthly * 100) / 100,
        benefits: form.benefits.split('\n').filter(Boolean),
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
        deliveryIncluded: form.deliveryIncluded,
        autoRenewal: form.autoRenewal,
        translations: {
          ...(hasKa ? { ka: { ...ka, benefits: ka.benefits ? ka.benefits.split('\n').filter(Boolean) : [] } } : {}),
          config: syncedCfg,
        },
      };
      if (form.discountPercent) body.discountPercent = Number(form.discountPercent);
      if (form.badge) body.badge = form.badge;
      if (form.description) body.description = form.description;
      const isNew = !plan.id;
      const res = await fetch(
        isNew ? `${API}/admin/subscription-plans` : `${API}/admin/subscription-plans/${plan.id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = Array.isArray(errData.message) ? errData.message.join(', ') : (errData.message || 'Save failed');
        setToast({ msg, type: 'error' });
        return;
      }
      const saved = await res.json();
      if (isNew) { plan.id = saved.id; }

      // Enforce badge uniqueness: clear same badge from all other plans
      if (body.badge) {
        const allRes = await fetch(`${API}/admin/subscription-plans`, { headers: { Authorization: `Bearer ${token()}` } });
        if (allRes.ok) {
          const allPlans = await allRes.json();
          await Promise.all(allPlans
            .filter((p: any) => p.id !== plan.id && p.badge === body.badge)
            .map((p: any) => fetch(`${API}/admin/subscription-plans/${p.id}`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: p.name, slug: p.slug, durationValue: p.durationValue, durationUnit: p.durationUnit,
                boxCount: p.boxCount, price: p.price, benefits: p.benefits ?? [],
                sortOrder: p.sortOrder ?? 0, isActive: p.isActive,
                deliveryIncluded: p.deliveryIncluded, autoRenewal: p.autoRenewal,
                translations: p.translations ?? {},
                ...(p.discountPercent != null ? { discountPercent: p.discountPercent } : {}),
                ...(p.monthlyEquivPrice != null ? { monthlyEquivPrice: p.monthlyEquivPrice } : {}),
                ...(p.description ? { description: p.description } : {}),
              }),
            }))
          );
        }
      }

      setToast({ msg: 'Plan saved!', type: 'success' });
      if (andClose) { setTimeout(() => { onSaved(); onClose(); }, 600); } else { onSaved(); }
    } finally { setSaving(false); }
  }

  // ── render ──

  const marginColor = margin >= 0 ? 'var(--green-700)' : 'var(--red-600)';
  const marginBg = margin >= 0 ? 'var(--green-50)' : 'var(--red-50)';
  const unaddedItems = boxItems.filter(b => !activeItems.find(i => i.productId === b.id));

  return (
    <>
      <div onClick={tryClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50, backdropFilter: 'blur(2px)' }} />

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, display: 'flex', alignItems: 'center', gap: 10,
          background: toast.type === 'error' ? 'var(--slate-800)' : 'var(--slate-900)',
          borderLeft: `4px solid ${toast.type === 'error' ? 'var(--red-500)' : 'var(--teal-600)'}`,
          color: 'var(--white)', borderRadius: 12, padding: '12px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.28)', fontSize: 13, fontWeight: 600,
          minWidth: 280, maxWidth: 440, animation: 'slideUp 0.22s ease',
        }}>
          <span style={{ fontSize: 16 }}>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span style={{ flex: 1 }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px', marginLeft: 4 }}>×</button>
        </div>
      )}

      {/* Unsaved changes confirm */}
      {showCloseConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setShowCloseConfirm(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'relative', background: 'var(--white)', borderRadius: 16, padding: '28px 32px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--orange-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 22 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 8px' }}>Discard unsaved changes?</h3>
            <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: '0 0 24px', lineHeight: 1.5 }}>You have unsaved edits to this plan. Closing now will lose all changes.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{ flex: 1, background: 'var(--red-500)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >Discard & close</button>
              <button
                onClick={() => setShowCloseConfirm(false)}
                style={{ flex: 1, background: 'var(--slate-100)', color: 'var(--slate-700)', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >Keep editing</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ position: 'fixed', top: 0, right: 0, width: 820, height: '100%', background: 'var(--white)', zIndex: 51, overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ position: 'sticky', top: 0, background: 'var(--slate-900)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1, flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--white)', fontWeight: 800, fontSize: 16 }}>{plan.name || 'New Plan'}</span>
              {plan.price ? <Pill bg="var(--teal-50)" color="var(--teal-600)" border="1px solid var(--teal-200)">₾{Number(plan.price).toFixed(2)}</Pill> : null}
              {plan.badge && <Pill bg="var(--teal-600)" color="var(--white)" border="none">{plan.badge}</Pill>}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0' }}>
              {plan.id ? `${plan.durationValue} ${plan.durationUnit.toLowerCase()}s · ${plan.boxCount} box${plan.boxCount > 1 ? 'es' : ''}` : 'Fill in Plan Settings to get started'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => save(true)} disabled={saving}
              onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
              onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'background 0.15s, transform 0.1s' }}>
              {saving ? 'Saving…' : '✓ Save All'}
            </button>
            <button onClick={tryClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--white)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--slate-200b)', flexShrink: 0 }}>
          {([['form', '⚙️ Plan Settings'], ['builder', '📦 Box Builder'], ['discounts', '🏷️ Discounts']] as const).map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); if (t === 'builder') setActiveBox(0); }} style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', color: tab === t ? 'var(--teal-600)' : 'var(--slate-500)', borderBottom: tab === t ? '2px solid var(--teal-600)' : '2px solid transparent' }}>{label}</button>
          ))}
        </div>

        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>

          {/* ── Global validation errors ── */}
          {Object.keys(formErrors).some(k => formErrors[k]) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {formErrors.kaName && (
                <div onClick={() => { setTab('form'); setLang('ka'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--amber-100)', border: '1.5px solid var(--amber-300)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}>
                  <svg width="14" height="14" fill="none" stroke="var(--amber-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber-800)' }}>Georgian translation is incomplete — <u>click to fill it in</u></span>
                </div>
              )}
              {Object.entries(formErrors).filter(([k, v]) => k !== 'kaName' && v).map(([k, msg]) => (
                <div key={k} onClick={() => { setTab('form'); setLang('en'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--red-50)', border: '1.5px solid var(--red-300)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}>
                  <svg width="14" height="14" fill="none" stroke="var(--red-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red-600)' }}>{msg as string} — <u>click to fix</u></span>
                </div>
              ))}
            </div>
          )}

          {/* ── BOX BUILDER TAB ── */}
          {tab === 'builder' && (<>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

              {/* Left: product picker + items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Box selector tabs for multi-box plans */}
                {boxCount > 1 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Array.from({ length: boxCount }, (_, i) => {
                      const bItems = syncedCfg.boxes[i]?.items || [];
                      const bTotal = bItems.reduce((s: number, it: PlanItem) => s + it.price * it.qty, 0);
                      const isActive = safeActiveBox === i;
                      return (
                        <button
                          key={i}
                          onClick={() => { setActiveBox(i); setCatalogueSearch(''); }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 14px', borderRadius: 10, border: `2px solid ${isActive ? 'var(--teal-600)' : 'var(--slate-200)'}`, background: isActive ? 'var(--teal-50)' : 'var(--white)', cursor: 'pointer', minWidth: 90, transition: 'all 0.12s' }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? 'var(--teal-600)' : 'var(--slate-500)' }}>Box {i + 1}</span>
                          <span style={{ fontSize: 10, color: isActive ? 'var(--teal-600)' : 'var(--slate-400)', marginTop: 1 }}>
                            {bItems.length} item{bItems.length !== 1 ? 's' : ''} · ₾{bTotal.toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>Total across all boxes:</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)' }}>₾{allProductTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Current box items */}
                <div style={{ background: 'var(--slate-50)', borderRadius: 12, border: '1px solid var(--slate-200b)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--slate-200b)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', flex: 1 }}>
                      {boxCount > 1 ? `Box ${safeActiveBox + 1} Contents` : 'Box Contents'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>{activeItems.length} item{activeItems.length !== 1 ? 's' : ''} · ₾{activeProductTotal.toFixed(2)} product cost</span>
                    {activeItems.length > 0 && (
                      <button
                        onClick={() => updateBox(safeActiveBox, () => [])}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-50)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--red-300)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--red-600)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--white)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--slate-200)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--slate-500)'; }}
                        onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                        onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                        style={{ background: 'var(--white)', color: 'var(--slate-500)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s' }}
                      >
                        Remove All
                      </button>
                    )}
                  </div>
                  {activeItems.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>
                      No items added yet — add products from the catalogue below
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          {['Product', 'Box price (₾)', 'Qty', 'Line total', ''].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Qty' || h === 'Line total' ? 'center' : 'left', fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--slate-100)', borderBottom: '1px solid var(--slate-200b)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeItems.map((item: PlanItem) => (
                          <tr key={item.productId} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--slate-800)' }}>{item.name}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ color: 'var(--slate-400)', fontSize: 12 }}>₾</span>
                                <input
                                  type="number" min="0" step="0.01"
                                  value={item.price}
                                  onChange={e => setItemPrice(item.productId, num(e.target.value))}
                                  style={{ width: 70, border: '1px solid var(--slate-200)', borderRadius: 7, padding: '5px 8px', fontSize: 12, outline: 'none', textAlign: 'right' }}
                                />
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                <button onClick={() => setItemQty(item.productId, item.qty - 1)} style={{ width: 22, height: 22, border: '1px solid var(--slate-200)', borderRadius: 5, background: 'var(--white)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-500)' }}>−</button>
                                <span style={{ width: 24, textAlign: 'center', fontWeight: 700, color: 'var(--slate-900)' }}>{item.qty}</span>
                                <button onClick={() => setItemQty(item.productId, item.qty + 1)} style={{ width: 22, height: 22, border: '1px solid var(--slate-200)', borderRadius: 5, background: 'var(--white)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-500)' }}>+</button>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--slate-900)' }}>₾{(item.price * item.qty).toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button onClick={() => removeItem(item.productId)} style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Add from catalogue */}
                {/* New Box Item button — above catalogue */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowNewBoxItemDrawer(true)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-50)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--slate-300)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--white)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--slate-200)'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    style={{ background: 'var(--white)', color: 'var(--slate-700)', border: '1.5px solid var(--slate-200)', borderRadius: 9, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s, transform 0.1s' }}
                  >+ New Box Item</button>
                </div>

                {boxItems.length > 0 && (
                  <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--slate-200b)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--slate-200b)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', flex: 1 }}>Add from Box Items catalogue</span>
                      {unaddedItems.length > 0 && (
                        <button
                          onClick={() => {
                            const visible = unaddedItems.filter(p => !catalogueSearch || p.name.toLowerCase().includes(catalogueSearch.toLowerCase()) || (p.sku || '').toLowerCase().includes(catalogueSearch.toLowerCase()) || (p.brand || '').toLowerCase().includes(catalogueSearch.toLowerCase()));
                            visible.forEach(p => addItem(p));
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
                          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                          style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s, transform 0.1s' }}
                        >
                          + Add All
                        </button>
                      )}
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--slate-400)', pointerEvents: 'none' }}>🔍</span>
                        <input
                          value={catalogueSearch}
                          onChange={e => setCatalogueSearch(e.target.value)}
                          placeholder="Search items..."
                          style={{ paddingLeft: 28, paddingRight: catalogueSearch ? 28 : 10, paddingTop: 5, paddingBottom: 5, fontSize: 12, border: '1px solid var(--slate-200)', borderRadius: 8, outline: 'none', width: 160, background: 'var(--slate-50)' }}
                        />
                        {catalogueSearch && (
                          <button onClick={() => setCatalogueSearch('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--slate-400)', padding: 0, lineHeight: 1 }}>×</button>
                        )}
                      </div>
                    </div>
                    {unaddedItems.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {unaddedItems.filter(p => !catalogueSearch || p.name.toLowerCase().includes(catalogueSearch.toLowerCase()) || (p.sku || '').toLowerCase().includes(catalogueSearch.toLowerCase()) || (p.brand || '').toLowerCase().includes(catalogueSearch.toLowerCase())).map(p => (
                          <div
                            key={p.id}
                            onClick={() => addItem(p)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--slate-50)', cursor: 'pointer', transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--teal-50)')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                          >
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 600, color: 'var(--slate-800)', margin: 0, fontSize: 13 }}>{p.name}</p>
                              <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>RRP ₾{Number(p.price).toFixed(2)}{p.inventory?.quantity !== undefined ? ` · ${p.inventory.quantity} in stock` : ''}</p>
                            </div>
                            <span style={{ background: 'var(--teal-50)', color: 'var(--teal-600)', border: '1px solid var(--teal-200)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>+ Add</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--green-700)', fontWeight: 600, background: 'var(--green-50)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>✓</span><span>All catalogue items are in this box</span>
                      </div>
                    )}
                  </div>
                )}

                {boxItems.length === 0 && (
                  <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--amber-800)' }}>
                    💡 No box items found. Go to <strong>Box Items</strong> page and toggle products as box-included first.
                  </div>
                )}

                {/* ── Gift Boxes ── */}
                <div style={{ borderTop: '2px dashed var(--slate-200)', paddingTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)' }}>🎁 Gift Boxes</span>
                      <span style={{ fontSize: 11, color: 'var(--slate-400)', marginLeft: 8 }}>Free bonus boxes included with this plan</span>
                    </div>
                    <button
                      onClick={addGiftBox}
                      style={{ background: 'var(--fuchsia-50)', color: 'var(--purple-600)', border: '1px solid var(--purple-200)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Add Gift Box
                    </button>
                  </div>

                  {(cfg.giftBoxes || []).length === 0 && (
                    <div style={{ background: 'var(--fuchsia-50)', border: '1px dashed var(--purple-200)', borderRadius: 10, padding: '20px 16px', textAlign: 'center', color: 'var(--purple-600)', fontSize: 13 }}>
                      No gift boxes yet — click "+ Add Gift Box" to create a free bonus box for this plan
                    </div>
                  )}

                  {(cfg.giftBoxes || []).map((gift, gi) => {
                    const gTotal = gift.items.reduce((s, i) => s + i.price * i.qty, 0);
                    const gUnadded = boxItems.filter(b => !gift.items.find(i => i.productId === b.id));
                    return (
                      <div key={gift.id} style={{ background: 'var(--fuchsia-50)', border: '1px solid var(--purple-200)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                        {/* Gift box header */}
                        <div style={{ padding: '10px 14px', background: 'var(--violet-50)', borderBottom: '1px solid var(--purple-200)', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 16 }}>🎁</span>
                          <input
                            value={gift.label}
                            onChange={e => updateGiftBox(gift.id, { label: e.target.value })}
                            style={{ flex: 1, border: '1px solid var(--purple-200)', borderRadius: 7, padding: '4px 8px', fontSize: 13, fontWeight: 700, outline: 'none', background: 'var(--white)', color: 'var(--violet-700)' }}
                          />
                          <input
                            value={gift.description}
                            onChange={e => updateGiftBox(gift.id, { description: e.target.value })}
                            placeholder="Short description (shown to customer)"
                            style={{ flex: 2, border: '1px solid var(--purple-200)', borderRadius: 7, padding: '4px 8px', fontSize: 12, outline: 'none', background: 'var(--white)', color: 'var(--slate-500)' }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--purple-600)', fontWeight: 600, whiteSpace: 'nowrap' }}>₾{gTotal.toFixed(2)} cost</span>
                          <button onClick={() => removeGiftBox(gift.id)} style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>✕ Remove</button>
                        </div>

                        {/* Gift box items */}
                        {gift.items.length > 0 && (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <tbody>
                              {gift.items.map(item => (
                                <tr key={item.productId} style={{ borderBottom: '1px solid var(--purple-100)' }}>
                                  <td style={{ padding: '7px 14px', fontWeight: 600, color: 'var(--slate-800)' }}>{item.name}</td>
                                  <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                      <button onClick={() => setGiftItemQty(gift.id, item.productId, item.qty - 1)} style={{ width: 20, height: 20, border: '1px solid var(--purple-200)', borderRadius: 4, background: 'var(--white)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet-700)' }}>−</button>
                                      <span style={{ width: 20, textAlign: 'center', fontWeight: 700, color: 'var(--violet-700)' }}>{item.qty}</span>
                                      <button onClick={() => setGiftItemQty(gift.id, item.productId, item.qty + 1)} style={{ width: 20, height: 20, border: '1px solid var(--purple-200)', borderRadius: 4, background: 'var(--white)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet-700)' }}>+</button>
                                    </div>
                                  </td>
                                  <td style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--violet-700)' }}>₾{(item.price * item.qty).toFixed(2)}</td>
                                  <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                    <button onClick={() => removeGiftItem(gift.id, item.productId)} style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', borderRadius: 5, padding: '2px 6px', fontSize: 11, cursor: 'pointer' }}>✕</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {/* Add items to gift box */}
                        {gUnadded.length > 0 && (
                          <div style={{ padding: '8px 14px', borderTop: gift.items.length > 0 ? '1px solid var(--purple-100)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <p style={{ fontSize: 11, color: 'var(--purple-600)', fontWeight: 600, margin: 0, flex: 1 }}>Add items to this gift box:</p>
                              <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--purple-400)', pointerEvents: 'none' }}>🔍</span>
                                <input
                                  value={giftSearch[gift.id] || ''}
                                  onChange={e => setGiftSearch(prev => ({ ...prev, [gift.id]: e.target.value }))}
                                  placeholder="Search..."
                                  style={{ paddingLeft: 24, paddingRight: giftSearch[gift.id] ? 22 : 8, paddingTop: 3, paddingBottom: 3, fontSize: 11, border: '1px solid var(--purple-200)', borderRadius: 7, outline: 'none', width: 120, background: 'var(--white)' }}
                                />
                                {giftSearch[gift.id] && (
                                  <button onClick={() => setGiftSearch(prev => ({ ...prev, [gift.id]: '' }))} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--purple-400)', padding: 0, lineHeight: 1 }}>×</button>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {gUnadded.filter(p => { const s = giftSearch[gift.id] || ''; return !s || p.name.toLowerCase().includes(s.toLowerCase()) || (p.sku || '').toLowerCase().includes(s.toLowerCase()); }).map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => addGiftItem(gift.id, p)}
                                  style={{ background: 'var(--white)', color: 'var(--violet-700)', border: '1px solid var(--purple-200)', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--violet-50)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
                                >
                                  + {p.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                </div>
              </div>

              {/* Right: cost breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Cost breakdown card */}
                <div style={{ background: 'var(--slate-50)', borderRadius: 12, border: '1px solid var(--slate-200b)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: 'var(--slate-900)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>Cost Breakdown</span>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>
                      {boxCount > 1 ? `Box ${safeActiveBox + 1} of ${boxCount}` : `Per plan · ${boxCount} box`}
                    </p>
                  </div>

                  <div style={{ padding: '0 0 0' }}>
                    {/* Products for active box */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--slate-200b)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>📦 Products ({activeItems.length})</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)' }}>₾{activeProductTotal.toFixed(2)}</span>
                      </div>
                      {activeItems.map((i: PlanItem) => (
                        <div key={i.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-400)', marginBottom: 2 }}>
                          <span>{i.name} ×{i.qty}</span>
                          <span>₾{(i.price * i.qty).toFixed(2)}</span>
                        </div>
                      ))}
                      {boxCount > 1 && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--slate-200)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-500)' }}>
                          <span>All {boxCount} boxes total</span>
                          <span style={{ fontWeight: 700 }}>₾{allProductTotal.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Operational cost (per box) */}
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--slate-200b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>⚙️ Operational cost {boxCount > 1 ? '(per box)' : ''}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>₾</span>
                        <input
                          type="number" min="0" step="0.01"
                          value={cfg.operationalCost}
                          onChange={e => setCfg(c => ({ ...c, operationalCost: num(e.target.value) }))}
                          style={{ width: 72, border: '1px solid var(--slate-200)', borderRadius: 7, padding: '4px 8px', fontSize: 12, outline: 'none', textAlign: 'right' }}
                        />
                      </div>
                    </div>

                    {/* Delivery cost */}
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--slate-200b)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: cfg.deliveryFree ? 0 : 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>🚚 Delivery</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: cfg.deliveryFree ? 'var(--teal-600)' : 'var(--slate-500)', fontWeight: 600 }}>
                          <input type="checkbox" checked={cfg.deliveryFree} onChange={e => setCfg(c => ({ ...c, deliveryFree: e.target.checked }))} style={{ accentColor: 'var(--teal-600)' }} />
                          Free delivery
                        </label>
                      </div>
                      {!cfg.deliveryFree && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>₾</span>
                          <input
                            type="number" min="0" step="0.01"
                            value={cfg.deliveryCost}
                            onChange={e => setCfg(c => ({ ...c, deliveryCost: num(e.target.value) }))}
                            style={{ width: 72, border: '1px solid var(--slate-200)', borderRadius: 7, padding: '4px 8px', fontSize: 12, outline: 'none', textAlign: 'right' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Gift boxes cost */}
                    {(cfg.giftBoxes || []).length > 0 && (
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--slate-200b)', background: 'var(--fuchsia-50)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple-600)' }}>🎁 Gift Boxes ({cfg.giftBoxes.length})</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple-600)' }}>₾{giftBoxTotal.toFixed(2)}</span>
                        </div>
                        {cfg.giftBoxes.map(g => {
                          const gc = g.items.reduce((s, i) => s + i.price * i.qty, 0);
                          return (
                            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--purple-500)', marginBottom: 2 }}>
                              <span>{g.label} ({g.items.length} items)</span>
                              <span>₾{gc.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Total cost */}
                    <div style={{ padding: '10px 16px', borderBottom: '2px solid var(--slate-900)', background: 'var(--slate-100)' }}>
                      {boxCount > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-500)', marginBottom: 4 }}>
                          <span>Box {safeActiveBox + 1} cost</span>
                          <span style={{ fontWeight: 600 }}>₾{activeBoxCost.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-900)' }}>Total cost {(cfg.giftBoxes || []).length > 0 ? '(incl. gifts)' : boxCount > 1 ? '(all boxes)' : ''}</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--slate-900)' }}>₾{totalCost.toFixed(2)}</span>
                      </div>
                      {boxCount > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-500)', marginTop: 3 }}>
                          <span>Avg per box</span><span>₾{(totalCost / boxCount).toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Selling price */}
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--slate-200b)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>Total price</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: pricingTotal > 0 ? 'var(--slate-900)' : 'var(--slate-400)' }}>
                          {pricingTotal > 0 ? `₾${pricingTotal.toFixed(2)}` : '—'}
                        </span>
                      </div>
                      {pricingDiscount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--teal-600)', marginTop: 2 }}>
                          <span>After {pricingDiscount}% discount</span>
                          <span>Save ₾{pricingSavings.toFixed(2)}</span>
                        </div>
                      )}
                      {boxCount > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate-500)', marginTop: 3 }}>
                          <span>Per box</span><span>₾{perBoxSell.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Margin */}
                    <div style={{ padding: '14px 16px', background: marginBg }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: marginColor }}>{margin >= 0 ? '✅ Margin' : '❌ Loss'}</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: marginColor }}>{margin >= 0 ? '+' : ''}₾{margin.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: marginColor, marginTop: 4, opacity: 0.8 }}>
                        <span>Margin %</span>
                        <span style={{ fontWeight: 700 }}>{marginPct >= 0 ? '+' : ''}{marginPct.toFixed(1)}%</span>
                      </div>
                      {boxCount > 1 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: marginColor, marginTop: 3, opacity: 0.7 }}>
                            <span>Avg per box margin</span>
                            <span>{margin >= 0 ? '+' : ''}₾{(margin / boxCount).toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: marginColor, marginTop: 2, opacity: 0.7 }}>
                            <span>Box {safeActiveBox + 1} margin</span>
                            <span>{(perBoxSell - activeBoxCost) >= 0 ? '+' : ''}₾{(perBoxSell - activeBoxCost).toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selling price summary */}
                <div style={{ background: 'var(--teal-50)', borderRadius: 10, border: '1px solid var(--teal-200)', padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal-600)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>What customer sees</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>₾{pricingTotal.toFixed(2)}</p>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '3px 0 0' }}>
                    {pricingMonths} month{pricingMonths > 1 ? 's' : ''} · {boxCount} box{boxCount > 1 ? 'es' : ''} · {cfg.deliveryFree ? 'Free delivery' : `₾${Number(cfg.deliveryCost).toFixed(2)} delivery`}
                  </p>
                  {pricingEffectiveMonthly > 0 && <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '3px 0 0' }}>₾{pricingEffectiveMonthly.toFixed(2)} / month</p>}
                  {pricingSavings > 0 && <p style={{ fontSize: 12, color: 'var(--teal-600)', margin: '3px 0 0', fontWeight: 600 }}>You save ₾{pricingSavings.toFixed(2)} ({pricingDiscount}%)</p>}
                  {(cfg.giftBoxes || []).map(g => (
                    <p key={g.id} style={{ fontSize: 12, color: 'var(--purple-600)', margin: '3px 0 0', fontWeight: 600 }}>
                      🎁 {g.label}{g.description ? ` — ${g.description}` : ''}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--slate-200b)' }}>
              <button onClick={() => save()} disabled={saving}
                onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 9, padding: '8px 22px', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'background 0.15s, transform 0.1s' }}>
                {saving ? 'Saving…' : '💾 Save Box Builder'}
              </button>
            </div>
          </> )}

          {/* ── PLAN SETTINGS TAB ── */}
          {tab === 'form' && (
            <div style={{ maxWidth: 600 }}>
              {formErrors.kaName && (
                <div onClick={() => setLang('ka')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--amber-100)', border: '1.5px solid var(--amber-300)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', marginBottom: 12 }}>
                  <svg width="14" height="14" fill="none" stroke="var(--amber-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber-800)' }}>Georgian translation is incomplete — <u>click to fill it in</u></span>
                </div>
              )}
              <LangTabs lang={lang} onChange={setLang} />

              {lang === 'en' ? (
                <>
                  {/* ── Identity ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {[
                      { label: 'Name', key: 'name', type: 'text', placeholder: '3-Month Plan' },
                      { label: 'Slug', key: 'slug', type: 'text', placeholder: '3-month' },
                      { label: 'Box Count', key: 'boxCount', type: 'number', placeholder: '3' },
                      { label: 'Sort Order', key: 'sortOrder', type: 'number', placeholder: '0' },
                    ].map((f: any) => (
                      <FormField key={f.key} label={f.label} required={['name', 'slug', 'boxCount'].includes(f.key)} error={formErrors[f.key]}>
                        <input type={f.type} value={form[f.key] ?? ''} onChange={e => { setForm((x: any) => ({ ...x, [f.key]: e.target.value })); setFormErrors((e2: any) => ({ ...e2, [f.key]: '' })); }} placeholder={f.placeholder} style={{ ...inputClass(), ...(formErrors[f.key] ? { borderColor: 'var(--red-500)' } : {}) }} />
                      </FormField>
                    ))}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700b)', marginBottom: 6 }}>Badge</label>
                      <CustomSelect
                        value={form.badge || ''}
                        onChange={v => { if (v === '__new__') { setShowNewBadge(true); } else { setForm((x: any) => ({ ...x, badge: v })); } }}
                        placeholder="No badge"
                        options={[
                          { value: '__new__', label: '＋ Create new badge…' },
                          { value: '', label: 'No badge', dividerBefore: true },
                          ...badges.map(b => ({ value: b, label: b })),
                        ]}
                        style={{ width: '100%' }}
                      />

                      {/* Inline new-badge creator */}
                      {showNewBadge && (
                        <div style={{ marginTop: 8, background: 'var(--slate-50)', border: '1.5px solid var(--slate-200)', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              autoFocus
                              value={newBadgeInput}
                              onChange={e => setNewBadgeInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && newBadgeInput.trim()) {
                                  const label = newBadgeInput.trim();
                                  const updated = [...new Set([...badges, label])];
                                  setBadges(updated);
                                  try { localStorage.setItem('pupbox_badges', JSON.stringify(updated.filter(b => !DEFAULT_BADGES.includes(b)))); } catch {}
                                  setForm((x: any) => ({ ...x, badge: label }));
                                  setNewBadgeInput(''); setShowNewBadge(false);
                                }
                                if (e.key === 'Escape') { setShowNewBadge(false); setNewBadgeInput(''); }
                              }}
                              placeholder="e.g. Flash Sale"
                              style={{ padding: '6px 10px', fontSize: 12, border: '1.5px solid var(--slate-200)', borderRadius: 8, outline: 'none', background: 'var(--white)', flex: 1, minWidth: 0 }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const label = newBadgeInput.trim();
                                if (!label) return;
                                const updated = [...new Set([...badges, label])];
                                setBadges(updated);
                                try { localStorage.setItem('pupbox_badges', JSON.stringify(updated.filter(b => !DEFAULT_BADGES.includes(b)))); } catch {}
                                setForm((x: any) => ({ ...x, badge: label }));
                                setNewBadgeInput(''); setShowNewBadge(false);
                              }}
                              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', background: 'var(--teal-600)', color: 'var(--white)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >+ Add</button>
                            <button type="button" onClick={() => { setShowNewBadge(false); setNewBadgeInput(''); }}
                              style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1.5px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-500)', cursor: 'pointer' }}>
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '5px 0 0' }}>One badge per label across all plans — assigning it here removes it from any other plan.</p>
                    </div>
                  </div>

                  {/* ── Pricing calculator ── */}
                  <div style={{ background: 'var(--slate-50)', borderRadius: 14, border: '1px solid var(--slate-200)', padding: '20px 20px 16px', marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pricing</p>

                    {/* Inputs row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <FormField label="Months" required error={formErrors.durationValue}>
                        <input
                          type="number" min="1" value={form.durationValue ?? ''}
                          onChange={e => { setForm((x: any) => ({ ...x, durationValue: e.target.value })); setFormErrors((e2: any) => ({ ...e2, durationValue: '' })); }}
                          placeholder="3"
                          style={{ ...inputClass(), ...(formErrors.durationValue ? { borderColor: 'var(--red-500)' } : {}) }}
                        />
                      </FormField>
                      <FormField label="Monthly price (₾)" required error={formErrors.monthlyPrice}>
                        <input
                          type="number" min="0" step="0.01" value={form.monthlyPrice ?? ''}
                          onChange={e => { setForm((x: any) => ({ ...x, monthlyPrice: e.target.value })); setFormErrors((e2: any) => ({ ...e2, monthlyPrice: '' })); }}
                          placeholder="50.00"
                          style={{ ...inputClass(), ...(formErrors.monthlyPrice ? { borderColor: 'var(--red-500)' } : {}) }}
                        />
                      </FormField>
                      <FormField label="Discount %">
                        <input
                          type="number" min="0" max="100" step="1" value={form.discountPercent ?? ''}
                          onChange={e => setForm((x: any) => ({ ...x, discountPercent: e.target.value }))}
                          placeholder="0"
                          style={inputClass()}
                        />
                      </FormField>
                    </div>

                    {/* Calculated results */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Total price', value: pricingTotal > 0 ? `₾${pricingTotal.toFixed(2)}` : '—', highlight: true },
                        { label: 'Effective / month', value: pricingEffectiveMonthly > 0 ? `₾${pricingEffectiveMonthly.toFixed(2)}` : '—', highlight: false },
                        { label: 'Customer saves', value: pricingSavings > 0 ? `₾${pricingSavings.toFixed(2)}` : pricingDiscount > 0 ? '₾0.00' : '—', highlight: false, accent: pricingSavings > 0 },
                      ].map(({ label, value, highlight, accent }) => (
                        <div key={label} style={{ background: highlight ? 'var(--teal-50)' : 'var(--white)', border: `1px solid ${highlight ? 'var(--teal-200)' : 'var(--slate-200)'}`, borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: accent ? 'var(--teal-600)' : highlight ? 'var(--teal-600)' : 'var(--slate-700)' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <FormField label="Description">
                      <input value={form.description || ''} onChange={e => setForm((x: any) => ({ ...x, description: e.target.value }))} placeholder="Short plan description" style={inputClass()} />
                    </FormField>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <FormField label="Benefits (one per line)">
                      <textarea value={form.benefits} onChange={e => setForm((x: any) => ({ ...x, benefits: e.target.value }))} rows={4} style={{ ...inputClass(), resize: 'none' } as any} />
                    </FormField>
                  </div>
                </>
              ) : (
                <>
                  {/* ── Identity (read-only mirrors) ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {[
                      { label: 'Name', value: form.name || '' },
                      { label: 'Slug', value: form.slug || '' },
                      { label: 'Box Count', value: String(form.boxCount ?? '') },
                      { label: 'Sort Order', value: String(form.sortOrder ?? '') },
                    ].map(({ label, value }) => (
                      <FormField key={label} label={label}>
                        <input value={value} readOnly style={{ ...inputClass(), background: 'var(--slate-50)', color: 'var(--slate-400)', cursor: 'not-allowed' }} />
                      </FormField>
                    ))}
                    {/* Badge read-only */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700b)', marginBottom: 6 }}>Badge</label>
                      <input value={form.badge || 'No badge'} readOnly style={{ ...inputClass(), background: 'var(--slate-50)', color: 'var(--slate-400)', cursor: 'not-allowed' }} />
                    </div>
                  </div>

                  {/* ── Pricing (read-only mirrors) ── */}
                  <div style={{ background: 'var(--slate-50)', borderRadius: 14, border: '1px solid var(--slate-200)', padding: '20px 20px 16px', marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pricing</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                      {[
                        { label: 'Months', value: String(form.durationValue ?? '') },
                        { label: 'Monthly price (₾)', value: pricingMonthly > 0 ? `₾${pricingMonthly.toFixed(2)}` : '' },
                        { label: 'Discount %', value: form.discountPercent ? String(form.discountPercent) : '0' },
                      ].map(({ label, value }) => (
                        <FormField key={label} label={label}>
                          <input value={value} readOnly style={{ ...inputClass(), background: 'var(--slate-50)', color: 'var(--slate-400)', cursor: 'not-allowed' }} />
                        </FormField>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Total price', value: pricingTotal > 0 ? `₾${pricingTotal.toFixed(2)}` : '—', highlight: true },
                        { label: 'Effective / month', value: pricingEffectiveMonthly > 0 ? `₾${pricingEffectiveMonthly.toFixed(2)}` : '—', highlight: false },
                        { label: 'Customer saves', value: pricingSavings > 0 ? `₾${pricingSavings.toFixed(2)}` : pricingDiscount > 0 ? '₾0.00' : '—', highlight: false, accent: pricingSavings > 0 },
                      ].map(({ label, value, highlight, accent }) => (
                        <div key={label} style={{ background: highlight ? 'var(--teal-50)' : 'var(--white)', border: `1px solid ${highlight ? 'var(--teal-200)' : 'var(--slate-200)'}`, borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: (accent as any) ? 'var(--teal-600)' : highlight ? 'var(--teal-600)' : 'var(--slate-700)' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Georgian text fields (editable) ── */}
                  <div style={{ marginBottom: 16 }}>
                    <FormField label="Name" required error={formErrors.kaName}>
                      <input value={ka.name} onChange={e => { setKa((k: any) => ({ ...k, name: e.target.value })); setFormErrors((e2: any) => ({ ...e2, kaName: '' })); }} placeholder="სახელი" style={{ ...inputClass(), ...(formErrors.kaName ? { borderColor: 'var(--red-500)' } : {}) }} />
                    </FormField>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <FormField label="Description">
                      <input value={ka.description} onChange={e => setKa((k: any) => ({ ...k, description: e.target.value }))} placeholder="მოკლე აღწერა" style={inputClass()} />
                    </FormField>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <FormField label="Benefits (one per line)">
                      <textarea value={ka.benefits} onChange={e => setKa((k: any) => ({ ...k, benefits: e.target.value }))} rows={4} placeholder={"უპირატესობა 1\nუპირატესობა 2"} style={{ ...inputClass(), resize: 'none' } as any} />
                    </FormField>
                  </div>
                </>
              )}


              {formErrors.kaName && (
                <div onClick={() => setLang('ka')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--amber-100)', border: '1.5px solid var(--amber-300)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', marginBottom: 12 }}>
                  <svg width="14" height="14" fill="none" stroke="var(--amber-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber-800)' }}>Georgian translation is incomplete — <u>click to fill it in</u></span>
                </div>
              )}
              {/* Delivery */}
              <div style={{ background: 'var(--slate-50)', borderRadius: 12, border: '1px solid var(--slate-200b)', padding: '18px 20px', marginBottom: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>🚚 Delivery</p>
                <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 0 14px' }}>Set delivery behaviour for subscribers on this plan.</p>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--slate-800)' }}>
                    <input type="checkbox" checked={cfg.deliveryFree} onChange={e => setCfg(c => ({ ...c, deliveryFree: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--teal-600)' }} />
                    <span><strong>Free delivery</strong> for all deliveries on this plan</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--slate-800)' }}>
                    <input type="checkbox" checked={form.deliveryIncluded} onChange={e => setForm((x: any) => ({ ...x, deliveryIncluded: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--teal-600)' }} />
                    <span>Show "Delivery included" badge on plan card</span>
                  </label>
                </div>
                {!cfg.deliveryFree && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 13, color: 'var(--slate-700b)', fontWeight: 600 }}>Fixed delivery cost per box: ₾</label>
                    <input type="number" min="0" step="0.01" value={cfg.deliveryCost} onChange={e => setCfg(c => ({ ...c, deliveryCost: num(e.target.value) }))} style={{ width: 80, border: '1px solid var(--slate-200)', borderRadius: 9, padding: '7px 10px', fontSize: 13, outline: 'none' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                <label style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', background: form.autoRenewal ? 'var(--green-50)' : 'var(--slate-50)', border: `1.5px solid ${form.autoRenewal ? 'var(--green-300)' : 'var(--slate-200)'}`, borderRadius: 12, padding: '12px 14px', transition: 'all 0.15s' }}>
                  <input type="checkbox" checked={form.autoRenewal} onChange={e => setForm((x: any) => ({ ...x, autoRenewal: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--teal-600)', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 3px' }}>🔄 Auto Renewal</p>
                    <p style={{ fontSize: 11, color: 'var(--slate-500)', margin: 0, lineHeight: 1.5 }}>When enabled, customers on this plan are automatically charged and receive the next box when their current period ends — no action needed from them. They can turn it off anytime from their account.</p>
                  </div>
                </label>
                <label style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', background: form.isActive ? 'var(--green-50)' : 'var(--slate-50)', border: `1.5px solid ${form.isActive ? 'var(--green-300)' : 'var(--slate-200)'}`, borderRadius: 12, padding: '12px 14px', transition: 'all 0.15s' }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm((x: any) => ({ ...x, isActive: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--teal-600)', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 3px' }}>✅ Active</p>
                    <p style={{ fontSize: 11, color: 'var(--slate-500)', margin: 0, lineHeight: 1.5 }}>Makes this plan visible and purchasable on the website. Disable to hide the plan from customers without deleting it.</p>
                  </div>
                </label>
                <button onClick={() => save()} disabled={saving}
                  onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  style={{ marginLeft: 'auto', background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 9, padding: '8px 22px', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'background 0.15s, transform 0.1s' }}>
                  {saving ? 'Saving…' : '💾 Save Settings'}
                </button>
              </div>
            </div>
          )}

          {/* ── DISCOUNTS TAB ── */}
          {tab === 'discounts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>

              {/* Referral discount */}
              <div style={{ background: 'var(--slate-50)', borderRadius: 12, border: '1px solid var(--slate-200b)', padding: '18px 20px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>🔗 Referral Discount</p>
                <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 0 16px' }}>Discount automatically applied when a new customer signs up via a referral link and buys this plan.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 13, color: 'var(--slate-700b)', fontWeight: 600 }}>Discount %</label>
                  <input
                    type="number" min="0" max="100" step="1"
                    value={cfg.referralDiscountPercent}
                    onChange={e => setCfg(c => ({ ...c, referralDiscountPercent: num(e.target.value) }))}
                    style={{ width: 80, border: '1px solid var(--slate-200)', borderRadius: 9, padding: '8px 12px', fontSize: 14, fontWeight: 700, outline: 'none', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>% off first payment</span>
                </div>
                {cfg.referralDiscountPercent > 0 && (
                  <div style={{ marginTop: 12, background: 'var(--teal-50)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--teal-600)' }}>
                    Customer pays ₾{(pricingTotal * (1 - cfg.referralDiscountPercent / 100)).toFixed(2)} instead of ₾{pricingTotal.toFixed(2)} on first order via referral
                  </div>
                )}
              </div>

              {/* Promo codes */}
              <div style={{ background: 'var(--slate-50)', borderRadius: 12, border: '1px solid var(--slate-200b)', padding: '18px 20px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>🏷️ Promo Codes</p>
                <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 0 16px' }}>Active coupons that can be applied to this plan. Toggle to allow/block each coupon.</p>

                {coupons.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--slate-400)', padding: '12px 0' }}>
                    No active coupons yet. Create them in the <strong>Coupons</strong> page first.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {coupons.map((c: any) => {
                      const linked = cfg.couponIds.includes(c.id);
                      return (
                        <div key={c.id} onClick={() => toggleCoupon(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: linked ? '2px solid var(--teal-600)' : '1px solid var(--slate-200)', background: linked ? 'var(--teal-50)' : 'var(--white)', cursor: 'pointer', transition: 'all 0.15s' }}>
                          <div style={{ width: 20, height: 20, borderRadius: 5, border: linked ? 'none' : '2px solid var(--slate-200)', background: linked ? 'var(--teal-600)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {linked && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5L9 3" stroke="var(--white)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--slate-900)', fontSize: 13, background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 5 }}>{c.code}</span>
                            {c.description && <span style={{ fontSize: 12, color: 'var(--slate-400)', marginLeft: 8 }}>{c.description}</span>}
                          </div>
                          <Pill bg={c.discountType === 'PERCENT' ? 'var(--teal-50)' : 'var(--blue-50)'} color={c.discountType === 'PERCENT' ? 'var(--teal-600)' : 'var(--blue-600)'} border="none">
                            {c.discountType === 'PERCENT' ? `${c.discountValue}% off` : `₾${c.discountValue} off`}
                          </Pill>
                          {c.expiresAt && (
                            <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>Until {new Date(c.expiresAt).toLocaleDateString('en-GB')}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {cfg.couponIds.length > 0 && (
                  <div style={{ marginTop: 14, background: 'var(--amber-50)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--amber-800)' }}>
                    ℹ️ {cfg.couponIds.length} coupon{cfg.couponIds.length > 1 ? 's' : ''} linked to this plan. These will be shown as available options at checkout.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--slate-200b)' }}>
                <button onClick={() => save()} disabled={saving}
                  onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 9, padding: '8px 22px', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'background 0.15s, transform 0.1s' }}>
                  {saving ? 'Saving…' : '💾 Save Discounts'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showNewBoxItemDrawer && <QuickAddBoxItemModal onClose={() => setShowNewBoxItemDrawer(false)} onCreated={loadBoxItems} />}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function decodeRole(): string {
  try {
    const t = localStorage.getItem('admin_token');
    if (!t) return '';
    const payload = JSON.parse(atob(t.split('.')[1]));
    return (payload.role || '').toLowerCase();
  } catch { return ''; }
}

const PAGE_DEFAULT_BADGES = ['Most Popular', 'Best Value', 'New', 'Limited'];

export default function AdminSubscriptionPlansPage() {
  const [showBoxItemModal, setShowBoxItemModal] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [builderPlan, setBuilderPlan] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [sort, setSort] = useState('date_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [planOrderCounts, setPlanOrderCounts] = useState<Record<string, number>>({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [badges, setBadges] = useState<string[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem('pupbox_badges') || '[]'); return [...new Set([...PAGE_DEFAULT_BADGES, ...saved])]; }
    catch { return PAGE_DEFAULT_BADGES; }
  });
  const [showBadgeManager, setShowBadgeManager] = useState(false);
  const [viewPlan, setViewPlan] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [badgeManagerInput, setBadgeManagerInput] = useState('');

  const token = () => localStorage.getItem('admin_token');

  async function load() {
    setLoading(true);
    setIsSuperAdmin(['super admin', 'superadmin', 'super_admin'].includes(decodeRole()));
    try {
      const res = await fetch(`${API}/admin/subscription-plans`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        // fetch order counts per plan
        const counts: Record<string, number> = {};
        await Promise.all(data.map(async (p: any) => {
          const r = await fetch(`${API}/orders/admin?planId=${p.id}&limit=1`, { headers: { Authorization: `Bearer ${token()}` } });
          if (r.ok) { const d = await r.json(); counts[p.id] = d.total || 0; }
        }));
        setPlanOrderCounts(counts);

      }
    } catch { } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setViewPlan(null); setShowCreate(false); setShowBadgeManager(false); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  async function create() {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = 'Required';
    if (!form.slug?.trim()) errors.slug = 'Required';
    else if (!/^[a-z0-9-]+$/.test(form.slug)) errors.slug = 'Lowercase, numbers & hyphens only';
    if (!form.monthlyPrice || isNaN(Number(form.monthlyPrice)) || Number(form.monthlyPrice) <= 0) errors.monthlyPrice = 'Must be > 0';
    if (!form.boxCount || isNaN(Number(form.boxCount)) || Number(form.boxCount) < 1) errors.boxCount = 'Min 1';
    if (Object.keys(errors).length) { setCreateErrors(errors); return; }
    setCreateErrors({});
    setSaving(true);
    try {
      const months = Number(form.durationValue) || 1;
      const monthly = Number(form.monthlyPrice) || 0;
      const disc = Number(form.discountPercent) || 0;
      const computedPrice = Math.round(monthly * months * (1 - disc / 100) * 100) / 100;
      const body = {
        name: form.name, slug: form.slug, durationValue: months, durationUnit: form.durationUnit || 'MONTH',
        boxCount: Number(form.boxCount), price: computedPrice,
        monthlyEquivPrice: Math.round((computedPrice / months) * 100) / 100,
        discountPercent: disc || null, benefits: [], sortOrder: 0, isActive: true,
        deliveryIncluded: true, autoRenewal: true,
      };
      const res = await fetch(`${API}/admin/subscription-plans`, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.message || `Error ${res.status}`;
        setCreateErrors({ slug: Array.isArray(msg) ? msg.join(', ') : String(msg) });
        return;
      }
      setShowCreate(false);
      setForm(EMPTY_FORM);
      load();
    } finally { setSaving(false); }
  }

  async function toggleActive(p: any) {
    await fetch(`${API}/admin/subscription-plans/${p.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, isActive: !p.isActive }) });
    load();
  }

  async function deletePlan(p: any) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await fetch(`${API}/admin/subscription-plans/${p.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    load();
  }

  const sortedPlans = [...plans].sort((a, b) => {
    if (sort === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sort === 'price_asc') return Number(a.price) - Number(b.price);
    if (sort === 'price_desc') return Number(b.price) - Number(a.price);
    if (sort === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    if (sort === 'name_desc') return (b.name || '').localeCompare(a.name || '');
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const totalPages = Math.ceil(sortedPlans.length / pageSize);
  const pagedPlans = sortedPlans.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 4px' }}>Subscription Plans</h1>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0 }}>Click "Configure" on any plan to set box contents, pricing, and discounts.</p>
      </div>

      <StatCards>
        <StatCard value={plans.length} label="total plans" theme="slate" />
        <StatCard value={plans.filter(p => p.isActive).length} label="active" theme="green" />
        <StatCard value={plans.filter(p => !p.isActive).length} label="disabled" theme="red" />
        <StatCard value={Object.values(planOrderCounts).filter(c => c > 0).length} label="plans in use" theme="blue" />
        {(() => {
          const popular = plans.find(p => p.badge === 'Most Popular');
          const bestValue = plans.find(p => p.badge === 'Best Value');
          return (<>
            <PlanHighlightCard
              badge="popular"
              planName={popular?.name}
              sub={popular ? `${planOrderCounts[popular.id] ?? 0} orders · ₾${(Number(popular.price) / Number(popular.durationValue)).toFixed(2)}/mo` : undefined}
              empty="No orders yet"
            />
            <PlanHighlightCard
              badge="best_value"
              planName={bestValue?.name}
              sub={bestValue ? `${planOrderCounts[bestValue.id] ?? 0} orders · ₾${(Number(bestValue.price) / Number(bestValue.durationValue)).toFixed(2)}/mo` : undefined}
              empty="No multi-month plans"
            />
          </>);
        })()}
      </StatCards>
      <Toolbar style={{ marginBottom: 20 }}>
        <ActionButton onClick={() => setBuilderPlan({ ...EMPTY_FORM })}>+ New Plan</ActionButton>
        <ActionButton variant="secondary" onClick={() => setShowBoxItemModal(true)}>+ New Box Item</ActionButton>
        <Link href="/dashboard/box-items" style={{ background: 'var(--white)', color: 'var(--slate-700)', border: '1.5px solid var(--slate-200)', borderRadius: 9, padding: '7px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'background 0.15s, border-color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--slate-50)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--slate-300)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--white)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--slate-200)'; }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          Box Items
        </Link>
        <button onClick={() => setShowBadgeManager(true)}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-200)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: '1.5px solid var(--slate-300)', background: 'var(--slate-100)', color: 'var(--slate-600)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s, transform 0.1s' }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Badges
        </button>
        <SortBar
          sort={sort}
          onSort={v => {
            if (!v) setSort(sort.startsWith('date') ? (sort === 'date_desc' ? 'date_asc' : 'date_desc') : 'date_desc');
            else setSort(v);
            setPage(1);
          }}
          fields={[
            { field: 'date',  label: 'Date',  icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
            { field: 'name',  label: 'Name',  icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="4 6 8 2 12 6"/><line x1="8" y1="2" x2="8" y2="22"/><path d="M16 6h4M16 12h3M16 18h2"/></svg> },
            { field: 'price', label: 'Price', icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
          ]}
        />
        <div style={{ marginLeft: 'auto' }}>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </Toolbar>

      {/* Quick-create form */}
      {showBadgeManager && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowBadgeManager(false); }}>
          <div style={{ background: 'var(--white)', borderRadius: 18, width: 480, maxWidth: '95vw', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" fill="none" stroke="var(--teal-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                Manage Badges
              </h2>
              <button onClick={() => setShowBadgeManager(false)}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--slate-600)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--slate-400)'; }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.88)'; }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '5px 7px', borderRadius: 8, transition: 'background 0.15s, color 0.15s, transform 0.1s' }}>×</button>
            </div>

            {/* Badge list — scrollable */}
            <div style={{ border: '1.5px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {badges.map((b, i) => {
                  const isDefault = PAGE_DEFAULT_BADGES.includes(b);
                  return (
                    <div key={b} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < badges.length - 1 ? '1px solid var(--slate-100)' : 'none', background: 'var(--white)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal-600)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-800)' }}>{b}</span>
                        {isDefault && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', background: 'var(--slate-100)', borderRadius: 4, padding: '1px 6px' }}>built-in</span>}
                      </div>
                      {!isDefault && (
                        <button
                          onClick={() => {
                            const updated = badges.filter(x => x !== b);
                            setBadges(updated);
                            try { localStorage.setItem('pupbox_badges', JSON.stringify(updated.filter(x => !PAGE_DEFAULT_BADGES.includes(x)))); } catch {}
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-100)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-50)'; }}
                          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.93)'; }}
                          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                          style={{ background: 'var(--red-50)', border: 'none', color: 'var(--red-600)', cursor: 'pointer', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px', transition: 'background 0.15s, transform 0.1s' }}
                          title="Remove badge"
                        >Remove</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add new badge */}
            <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-700b)', margin: '0 0 10px' }}>Add new badge</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={badgeManagerInput}
                  onChange={e => setBadgeManagerInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setShowBadgeManager(false); return; }
                    if (e.key === 'Enter' && badgeManagerInput.trim()) {
                      const label = badgeManagerInput.trim();
                      const updated = [...new Set([...badges, label])];
                      setBadges(updated);
                      try { localStorage.setItem('pupbox_badges', JSON.stringify(updated.filter(x => !PAGE_DEFAULT_BADGES.includes(x)))); } catch {}
                      setBadgeManagerInput('');
                    }
                  }}
                  placeholder="Badge label, e.g. Flash Sale"
                  style={{ padding: '7px 12px', fontSize: 13, border: '1.5px solid var(--slate-200)', borderRadius: 9, outline: 'none', background: 'var(--white)', flex: 1 }}
                />
                <button
                  onClick={() => {
                    const label = badgeManagerInput.trim();
                    if (!label) return;
                    const updated = [...new Set([...badges, label])];
                    setBadges(updated);
                    try { localStorage.setItem('pupbox_badges', JSON.stringify(updated.filter(x => !PAGE_DEFAULT_BADGES.includes(x)))); } catch {}
                    setBadgeManagerInput('');
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  style={{ padding: '7px 18px', fontSize: 13, fontWeight: 700, borderRadius: 9, border: 'none', background: 'var(--teal-600)', color: 'var(--white)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s, transform 0.1s' }}
                >+ Add</button>
              </div>
            </div>
          </div>
        </div>
      )}


      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : (
        <>
        {viewMode === 'list' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 18px', marginBottom: 2 }}>
            <div style={{ flex: '0 0 180px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Plan</div>
            <div style={{ flex: '0 0 90px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Price (₾)</div>
            <div style={{ flex: '0 0 90px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Per Month (₾)</div>
            <div style={{ flex: '0 0 100px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Duration</div>
            <div style={{ flex: '0 0 80px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Discount</div>
            <div style={{ flex: '0 0 80px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Boxes</div>
            <div style={{ flex: '0 0 70px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Orders</div>
            <div style={{ flex: '0 0 120px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Margin (₾)</div>
            <div style={{ flex: '0 0 55px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Status</div>
            <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Actions</div>
          </div>
        )}
        <div style={viewMode === 'list' ? { display: 'flex', flexDirection: 'column', gap: 8 } : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {pagedPlans.map(p => {
            const cfg = p.translations?.config;
            const itemCount = cfg?.planItems?.length || 0;
            const productCost = cfg?.planItems?.reduce((s: number, i: any) => s + i.price * i.qty, 0) || 0;
            const opCost = cfg?.operationalCost || 0;
            const delCost = cfg?.deliveryFree ? 0 : (cfg?.deliveryCost || 0);
            const margin = Number(p.price) - productCost - opCost - delCost;
            const hasConfig = itemCount > 0;
            const canDelete = isSuperAdmin && (planOrderCounts[p.id] ?? 1) === 0;
            const isDisabled = !p.isActive;

            if (viewMode === 'list') return (
              <div key={p.id} style={{ background: isDisabled ? 'var(--slate-50)' : 'var(--white)', borderRadius: 12, border: '1px solid var(--slate-200b)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, opacity: isDisabled ? 0.6 : 1 }}>
                <div style={{ flex: '0 0 180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-900)' }}>{p.name}</span>
                    {p.badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--teal-600)', color: 'var(--white)' }}>{p.badge}</span>}
                  </div>
                </div>
                <div style={{ flex: '0 0 90px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-900)' }}>{Number(p.price).toFixed(0)}</span>
                </div>
                <div style={{ flex: '0 0 90px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-700b)' }}>{(Number(p.price) / (p.durationValue || 1)).toFixed(0)}</span>
                </div>
                <div style={{ flex: '0 0 100px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-700b)' }}>{p.durationValue} {p.durationUnit?.toLowerCase()}</span>
                </div>
                <div style={{ flex: '0 0 80px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : (p.discountPercent ? 'var(--teal-600)' : 'var(--slate-400)') }}>{p.discountPercent ? `-${p.discountPercent}%` : '—'}</span>
                </div>
                <div style={{ flex: '0 0 80px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-700b)' }}>{p.boxCount}</span>
                </div>
                <div style={{ flex: '0 0 70px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-700b)' }}>{planOrderCounts[p.id] || 0}</span>
                </div>
                <div style={{ flex: '0 0 120px', fontSize: 11 }}>
                  {hasConfig ? <span style={{ color: margin >= 0 ? 'var(--green-700)' : 'var(--red-600)', fontWeight: 700 }}>{margin >= 0 ? '+' : ''}{margin.toFixed(2)}</span> : <span style={{ color: 'var(--amber-500)' }}>⚠️ Not configured</span>}
                </div>
                <span style={{ flex: '0 0 55px', fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600, background: isDisabled ? 'var(--slate-100)' : 'var(--green-50)', color: isDisabled ? 'var(--slate-400)' : 'var(--green-800)', textAlign: 'center' as const }}>{isDisabled ? 'Off' : 'Live'}</span>
                <RowActions
                  onView={() => setViewPlan(p)}
                  onConfigure={() => setBuilderPlan(p)}
                  onToggle={() => toggleActive(p)}
                  onDelete={() => deletePlan(p)}
                  isDisabled={isDisabled}
                  canDelete={canDelete}
                  toggleLabel={isDisabled ? 'Enable' : 'Disable'}
                />
              </div>
            );

            return (
              <div key={p.id}
                onMouseEnter={e => { if (!isDisabled) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
                style={{ background: isDisabled ? 'var(--slate-50)' : 'var(--white)', borderRadius: 16, border: p.badge ? '2px solid var(--teal-600)' : isDisabled ? '1px solid var(--slate-200)' : '1px solid var(--slate-200b)', padding: 22, position: 'relative', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', opacity: isDisabled ? 0.65 : 1, transition: 'box-shadow 0.18s, transform 0.18s' }}>
                {p.badge && <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--teal-600)', color: 'var(--white)', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 999, whiteSpace: 'nowrap' as const }}>{p.badge}</span>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-900)', margin: 0 }}>{p.name}</h3>
                    <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '3px 0 0' }}>{p.durationValue} {p.durationUnit.toLowerCase()} · {p.boxCount} box{p.boxCount > 1 ? 'es' : ''}</p>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600, background: isDisabled ? 'var(--slate-100)' : 'var(--green-50)', color: isDisabled ? 'var(--slate-400)' : 'var(--green-800)' }}>{isDisabled ? 'Off' : 'Live'}</span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-900)', margin: '0 0 2px' }}>₾{Number(p.price).toFixed(0)}</p>
                {p.discountPercent && <p style={{ fontSize: 12, color: 'var(--teal-600)', fontWeight: 600, margin: '0 0 12px' }}>Save {p.discountPercent}%</p>}
                {hasConfig ? (
                  <div style={{ background: 'var(--slate-50)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-500)', marginBottom: 3 }}><span>📦 {itemCount} products</span><span>₾{productCost.toFixed(2)}</span></div>
                    {opCost > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-500)', marginBottom: 3 }}><span>⚙️ Operational</span><span>₾{opCost.toFixed(2)}</span></div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-500)', marginBottom: 6 }}><span>🚚 Delivery</span><span>{cfg?.deliveryFree ? 'Free' : `₾${delCost.toFixed(2)}`}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 5, borderTop: '1px solid var(--slate-200b)', fontWeight: 700 }}>
                      <span style={{ color: margin >= 0 ? 'var(--green-700)' : 'var(--red-600)' }}>{margin >= 0 ? '✅ Margin' : '❌ Loss'}</span>
                      <span style={{ color: margin >= 0 ? 'var(--green-700)' : 'var(--red-600)' }}>{margin >= 0 ? '+' : ''}₾{margin.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: 'var(--amber-800)' }}>⚠️ Not configured — click Configure to add box items and costs</div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setViewPlan(p)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.15)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.08)'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.08)'; }}
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(13,148,136,0.08)', color: 'var(--teal-600)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, transform 0.1s', flexShrink: 0 }}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>
                  </button>
                  <button onClick={() => setBuilderPlan(p)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    style={{ flex: 1, fontSize: 11, padding: '6px 10px', borderRadius: 8, background: 'var(--teal-600)', color: 'var(--white)', border: 'none', cursor: 'pointer', fontWeight: 700, transition: 'background 0.15s, transform 0.1s' }}>Configure</button>
                  <button onClick={() => toggleActive(p)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDisabled ? 'var(--green-100)' : 'var(--slate-200)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isDisabled ? 'var(--green-50)' : 'var(--slate-100)'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    style={{ flex: 1, fontSize: 11, padding: '6px 10px', borderRadius: 8, background: isDisabled ? 'var(--green-50)' : 'var(--slate-100)', color: isDisabled ? 'var(--green-800)' : 'var(--slate-500)', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'background 0.15s, transform 0.1s' }}>{isDisabled ? 'Enable' : 'Disable'}</button>
                  {canDelete && <button onClick={() => deletePlan(p)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-100)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-50)'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    style={{ fontSize: 11, padding: '6px 10px', borderRadius: 8, background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'background 0.15s, transform 0.1s' }}>Delete</button>}
                </div>
              </div>
            );
          })}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={sortedPlans.length}
          onPageChange={setPage}
          onPageSizeChange={n => { setPageSize(n); setPage(1); }}
          pageSizeOptions={[5, 10, 15, 20, 50]}
        />
        </>
      )}

      {/* Plan builder drawer */}
      {builderPlan && (
        <PlanBuilder
          plan={builderPlan}
          onClose={() => setBuilderPlan(null)}
          onSaved={() => { load(); }}
          badges={badges}
          setBadges={setBadges}
        />
      )}

      {/* Plan view modal */}
      {viewPlan && (() => {
        const vp = viewPlan;
        const cfg = vp.translations?.config;
        const isDisabled = !vp.isActive;
        const orderCount = planOrderCounts[vp.id] || 0;
        const itemCount = cfg?.planItems?.length || 0;
        const hasConfig = itemCount > 0;
        const productCost = cfg?.planItems?.reduce((s: number, i: any) => s + i.price * i.qty, 0) || 0;
        const opCost = cfg?.operationalCost || 0;
        const delCost = cfg?.deliveryFree ? 0 : (cfg?.deliveryCost || 0);
        const margin = Number(vp.price) - productCost - opCost - delCost;
        return (
          <div onClick={() => setViewPlan(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
              {/* Sticky header */}
              <div style={{ padding: '28px 36px 20px', borderBottom: '1px solid var(--slate-200)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 4 }}>
                      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--slate-900)' }}>{vp.name}</h2>
                      {vp.badge && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' }}>{vp.badge}</span>}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: isDisabled ? 'var(--slate-100)' : 'var(--green-50)', color: isDisabled ? 'var(--slate-400)' : 'var(--green-800)' }}>{isDisabled ? 'Disabled' : 'Live'}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-500)' }}>{vp.durationValue} month{vp.durationValue > 1 ? 's' : ''} · {vp.boxCount} box{vp.boxCount > 1 ? 'es' : ''}</p>
                  </div>
                  <button onClick={() => setViewPlan(null)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.9)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: 'var(--slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, transform 0.1s', flexShrink: 0 }}>×</button>
                </div>
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Price', value: `₾${Number(vp.price).toFixed(2)}` },
                    { label: 'Orders', value: String(orderCount) },
                    { label: 'Discount', value: vp.discountPercent ? `-${vp.discountPercent}%` : '—' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--slate-50)', borderRadius: 10, padding: '10px 14px' }}>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--slate-400)', marginBottom: 2 }}>{s.label}</p>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scrollable body */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '24px 36px' }}>

              {/* Description */}
              {(vp.description || vp.descriptionKa) && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Description</p>
                  {vp.description && <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--slate-700b)' }}><strong>EN:</strong> {vp.description}</p>}
                  {vp.descriptionKa && <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-700b)' }}><strong>KA:</strong> {vp.descriptionKa}</p>}
                </div>
              )}

              {/* Delivery + Settings row */}
              <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 13, color: 'var(--slate-700b)', background: 'rgba(241,245,249,0.7)', padding: '4px 12px', borderRadius: 8 }}>
                  Delivery: <strong>{cfg?.deliveryFree ? 'Free' : cfg ? `₾${Number(cfg.deliveryCost || 0).toFixed(2)}` : '—'}</strong>
                </span>
                <span style={{ fontSize: 13, color: vp.autoRenewal ? 'var(--green-800)' : 'var(--slate-500)', background: vp.autoRenewal ? 'rgba(240,253,244,0.7)' : 'rgba(241,245,249,0.7)', padding: '4px 12px', borderRadius: 8 }}>
                  Auto-Renewal: <strong>{vp.autoRenewal ? 'On' : 'Off'}</strong>
                </span>
                <span style={{ fontSize: 13, color: !isDisabled ? 'var(--green-800)' : 'var(--slate-500)', background: !isDisabled ? 'rgba(240,253,244,0.7)' : 'rgba(241,245,249,0.7)', padding: '4px 12px', borderRadius: 8 }}>
                  Active: <strong>{!isDisabled ? 'Live' : 'Hidden'}</strong>
                </span>
              </div>

              {/* Products list */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Products Included</p>
                {hasConfig ? (
                  <div style={{ border: '1px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 0 }}>
                      {/* Header */}
                      <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>Product</div>
                      <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', textAlign: 'center' as const }}>Qty</div>
                      <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', textAlign: 'right' as const }}>Cost</div>
                      {/* Rows */}
                      {(cfg.planItems || []).map((it: any, ii: number) => (
                        <>
                          <div key={`n${ii}`} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--slate-700b)', borderBottom: ii < cfg.planItems.length - 1 ? '1px solid var(--slate-100)' : 'none' }}>{it.name || it.productName || '—'}</div>
                          <div key={`q${ii}`} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--slate-500)', textAlign: 'center' as const, borderBottom: ii < cfg.planItems.length - 1 ? '1px solid var(--slate-100)' : 'none' }}>×{it.qty || 1}</div>
                          <div key={`p${ii}`} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--slate-700b)', fontWeight: 600, textAlign: 'right' as const, borderBottom: ii < cfg.planItems.length - 1 ? '1px solid var(--slate-100)' : 'none' }}>₾{((it.price || 0) * (it.qty || 1)).toFixed(2)}</div>
                        </>
                      ))}
                    </div>
                    {/* Totals */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0, borderTop: '1px solid var(--slate-200)', background: 'var(--slate-50)' }}>
                      <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--slate-500)' }}>Products subtotal</div>
                      <div style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, color: 'var(--slate-700b)', textAlign: 'right' as const }}>₾{productCost.toFixed(2)}</div>
                      {opCost > 0 && <>
                        <div style={{ padding: '4px 14px', fontSize: 12, color: 'var(--slate-500)' }}>Operational cost</div>
                        <div style={{ padding: '4px 14px', fontSize: 12, fontWeight: 600, color: 'var(--slate-700b)', textAlign: 'right' as const }}>₾{opCost.toFixed(2)}</div>
                      </>}
                      <div style={{ padding: '4px 14px 8px', fontSize: 12, color: 'var(--slate-500)' }}>Delivery</div>
                      <div style={{ padding: '4px 14px 8px', fontSize: 12, fontWeight: 600, color: 'var(--slate-700b)', textAlign: 'right' as const }}>{cfg?.deliveryFree ? 'Free' : `₾${delCost.toFixed(2)}`}</div>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-400)', fontStyle: 'italic' }}>No products added yet</p>
                )}
              </div>

              {/* Margin summary */}
              {hasConfig ? (
                <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: margin >= 0 ? 'var(--green-800)' : 'var(--red-600)' }}>{margin >= 0 ? '✅ Margin' : '❌ Loss'}</span>
                  <span style={{ color: margin >= 0 ? 'var(--green-800)' : 'var(--red-600)' }}>{margin >= 0 ? '+' : ''}₾{margin.toFixed(2)}</span>
                </div>
              ) : (
                <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--amber-800)' }}>⚠️ Not configured — no box items or costs set yet</div>
              )}

              </div>{/* end scrollable */}

              {/* Sticky footer */}
              <div style={{ display: 'flex', gap: 10, padding: '16px 36px', borderTop: '1px solid var(--slate-200)', background: 'var(--white)', borderRadius: '0 0 18px 18px', flexShrink: 0 }}>
                <button onClick={() => { setViewPlan(null); setBuilderPlan(vp); }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'var(--teal-600)', color: 'var(--white)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'background 0.15s, transform 0.1s' }}>Configure</button>
                <button onClick={() => setViewPlan(null)}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-200)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'var(--slate-100)', color: 'var(--slate-700b)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'background 0.15s, transform 0.1s' }}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
      {showBoxItemModal && <QuickAddBoxItemModal onClose={() => setShowBoxItemModal(false)} />}
    </div>
  );
}
