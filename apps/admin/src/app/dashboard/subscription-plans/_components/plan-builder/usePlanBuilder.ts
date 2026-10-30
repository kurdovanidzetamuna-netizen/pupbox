'use client';
import { useState, useEffect, useMemo } from 'react';
import type { Lang } from '@/components/LangTabs';
import type { PlanItem, BoxConfig, GiftBox } from '../../_lib/types';
import { EMPTY_FORM, EMPTY_KA, EMPTY_CONFIG } from '../../_lib/constants';
import { migrateConfig, num } from '../../_lib/plan-config';
import { savePlan, clearBadgeFromOtherPlans, fetchBoxItems, fetchActiveCoupons, fetchTiers } from '../../_lib/api';

export type BuilderTab = 'builder' | 'form' | 'discounts';

export type PlanBuilderProps = { plan: any; onClose: () => void; onSaved: () => void; badges: string[]; addBadge: (label: string) => void };

/**
 * All state, derived figures and actions of the plan drawer, in one place.
 *
 * The tabs only render what this returns. Keeping state here rather than in
 * each tab is deliberate: tabs unmount when you switch away, and searches or
 * a half-typed badge would otherwise be lost on every switch.
 */
export function usePlanBuilder({ plan, onClose, onSaved, badges, addBadge }: PlanBuilderProps) {
  const [tab, setTab] = useState<BuilderTab>('form');
  const [boxItems, setBoxItems] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  useEffect(() => { fetchTiers().then(setTiers).catch(() => {}); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const [showNewBadge, setShowNewBadge] = useState(false);
  // Once the slug is edited by hand it stops following the name. Existing
  // plans start "touched" because their URL is already published.
  const [slugTouched, setSlugTouched] = useState(false);
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
    tierId: plan.tierId || '',
  });
  const [ka, setKa] = useState<any>(() => {
    const d = plan.translations?.ka;
    return d ? { name: d.name || '', description: d.description || '', benefits: (d.benefits || []).join('\n') } : { ...EMPTY_KA };
  });

  const boxCount = Number(form.boxCount) || 1;

  // Every live plan ships one box per month, and the only plans where the two
  // numbers disagreed were test plans where they had drifted apart unnoticed —
  // they used to sit in different sections of this form. So boxes follows
  // months while the two agree, and stops as soon as a count is set by hand.
  //
  // "Agreeing" is the whole state: there is no separate linked flag, because a
  // flag can contradict the numbers — unlink at 8/9, step months to 9, and the
  // form would claim they were out of sync while showing 9 and 9.
  const boxesLinked = Number(form.boxCount) === Number(form.durationValue);
  const setMonths = (v: string) => {
    setForm((x: any) => ({ ...x, durationValue: v, ...(boxesLinked ? { boxCount: v } : {}) }));
    setFormErrors((e2: any) => ({ ...e2, durationValue: '', ...(boxesLinked ? { boxCount: '' } : {}) }));
  };
  const setBoxes = (v: string) => {
    setForm((x: any) => ({ ...x, boxCount: v }));
    setFormErrors((e2: any) => ({ ...e2, boxCount: '' }));
  };

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
  const initForm = JSON.stringify({ ...EMPTY_FORM, ...plan, benefits: (plan.benefits || []).join('\n'), discountPercent: plan.discountPercent || '', monthlyPrice: initMonthlyPrice, tierId: plan.tierId || '' });
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
    fetchBoxItems().then(setBoxItems);
  }

  useEffect(() => {
    Promise.all([fetchBoxItems(), fetchActiveCoupons()]).then(([items, coup]) => {
      setBoxItems(items);
      setCoupons(coup);
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

  // What still stands between this and a plan customers can buy. Surfaced as a
  // named list rather than letting Save fail and scatter red text around the
  // form, so you know what is left without hunting for it.
  const benefitLines = String(form.benefits || '').split('\n').map((l: string) => l.trim()).filter(Boolean);
  const blockers: { label: string; tab: 'form' | 'builder' | 'discounts'; lang?: Lang }[] = [
    ...(!String(form.name || '').trim() ? [{ label: 'Plan name', tab: 'form' as const }] : []),
    ...(!(Number(form.durationValue) > 0) ? [{ label: 'How many months it runs', tab: 'form' as const }] : []),
    ...(!(Number(form.boxCount) > 0) ? [{ label: 'How many boxes', tab: 'form' as const }] : []),
    ...(!(pricingTotal > 0) ? [{ label: 'A price', tab: 'form' as const }] : []),
    ...(benefitLines.length === 0 ? [{ label: 'At least one benefit', tab: 'form' as const }] : []),
  ];
  // Worth flagging but not worth blocking on — you can launch without them.
  const warnings: { label: string; tab: 'form' | 'builder' | 'discounts' }[] = [
    ...(allProductTotal === 0 ? [{ label: 'No box contents yet, so margin is unknown', tab: 'builder' as const }] : []),
    ...(!String(ka.name || '').trim() ? [{ label: 'No Georgian name — the site will show the English one', tab: 'form' as const }] : []),
  ];
  const canCreate = blockers.length === 0;
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
        listed: form.listed !== false,
        deliveryIncluded: form.deliveryIncluded,
        autoRenewal: form.autoRenewal,
        giftable: form.giftable,
        tierId: form.tierId || null,
        translations: {
          ...(hasKa ? { ka: { ...ka, benefits: ka.benefits ? ka.benefits.split('\n').filter(Boolean) : [] } } : {}),
          config: syncedCfg,
        },
      };
      if (form.discountPercent) body.discountPercent = Number(form.discountPercent);
      if (form.badge) body.badge = form.badge;
      if (form.description) body.description = form.description;
      const isNew = !plan.id;
      let saved;
      try { saved = await savePlan(plan.id, body); } catch (e: any) {
        const m = e.body?.message;
        setToast({ msg: Array.isArray(m) ? m.join(', ') : (m || 'Save failed'), type: 'error' });
        return;
      }
      if (isNew) { plan.id = saved.id; }

      // Enforce badge uniqueness: clear same badge from all other plans
      if (body.badge) await clearBadgeFromOtherPlans(body.badge, plan.id);

      setToast({ msg: 'Plan saved!', type: 'success' });
      if (andClose) { setTimeout(() => { onSaved(); onClose(); }, 600); } else { onSaved(); }
    } finally { setSaving(false); }
  }

  // ── view helpers ──

  const marginColor = margin >= 0 ? 'var(--green-700)' : 'var(--red-600)';
  const marginBg = margin >= 0 ? 'var(--green-50)' : 'var(--red-50)';
  const unaddedItems = boxItems.filter(b => !activeItems.find(i => i.productId === b.id));

  return {
    plan, onClose, badges, addBadge, tiers, tab, setTab, boxItems, coupons, saving, lang, setLang,
    formErrors, setFormErrors, toast, setToast, showNewBadge, setShowNewBadge, slugTouched,
    setSlugTouched, newBadgeInput, setNewBadgeInput, form, setForm, ka, setKa, boxCount,
    boxesLinked, setMonths, setBoxes, pricingMonths, pricingMonthly, pricingDiscount,
    pricingTotal, pricingEffectiveMonthly, pricingSavings, cfg, setCfg, setActiveBox,
    catalogueSearch, setCatalogueSearch, showNewBoxItemDrawer, setShowNewBoxItemDrawer,
    giftSearch, setGiftSearch, showCloseConfirm, setShowCloseConfirm, tryClose, loadBoxItems,
    syncedCfg, safeActiveBox, activeItems, activeProductTotal, allProductTotal, activeBoxCost,
    giftBoxTotal, totalCost, blockers, canCreate, margin, marginPct, perBoxSell, addGiftBox,
    removeGiftBox, updateGiftBox, addGiftItem, removeGiftItem, setGiftItemQty, updateBox,
    addItem, removeItem, setItemQty, setItemPrice, toggleCoupon, save, marginColor, marginBg,
    unaddedItems,
  };
}

export type PlanBuilderState = ReturnType<typeof usePlanBuilder>;
