'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { fill } from '@/context/strings/purchase';
import { Heading, PAGE_TOP } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/icons';
import Modal from '@/components/ui/Modal';
import { FieldError } from '@/components/ui/FormError';
import QuantityStepper from '@/components/shop/QuantityStepper';
import { categoryLook } from '@/lib/shopIcons';
import { available } from '@/lib/useChoice';

type Config = { minItems: number; packingFee: number; monthlyDiscount: number };
const money = (n: number) => `₾${n.toFixed(2)}`;
const r2 = (n: number) => Math.round(n * 100) / 100;
const DRAFT = 'pupbox_box_draft';

/**
 * Build-your-own box: tap + on products admin allows, once or every month
 * (with the monthly discount). The summary — what's in it, how many more are
 * needed, the price — sits beside the products on wide screens and in a bar
 * at the bottom on phones. Editing a box from the basket replaces it there.
 */
export default function BuildBoxView({ products, config }: { products: any[]; config: Config }) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const { cart, ready, addBox } = useCart();
  const editId = params.get('edit');

  const [monthly, setMonthly] = useState(params.get('monthly') === '1');
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [cat, setCat] = useState('');
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const loaded = useRef(false);

  // Editing a box from the basket: start from what's in it. Otherwise pick up
  // an unfinished box from this browser (a convenience; it may be gone).
  useEffect(() => {
    if (loaded.current) return;
    if (editId) {
      if (!ready) return;
      const line = cart?.items?.find((i: any) => i.id === editId && i.customBox);
      if (line) {
        setPicks(Object.fromEntries(line.customBox.items.map((x: any) => [x.productId, x.quantity])));
        setMonthly(!!line.customBox.monthly);
      }
    } else {
      try {
        const d = JSON.parse(localStorage.getItem(DRAFT) || 'null');
        if (d?.picks) { setPicks(d.picks); if (params.get('monthly') == null) setMonthly(!!d.monthly); }
      } catch {}
    }
    loaded.current = true;
  }, [editId, ready, cart, params]);
  useEffect(() => {
    if (!loaded.current || editId) return;
    try { localStorage.setItem(DRAFT, JSON.stringify({ picks, monthly })); } catch {}
  }, [picks, monthly, editId]);

  const nameOf = (p: any) => (lang === 'ka' && p.translations?.ka?.name?.trim()) || p.name;
  const shopUnit = (p: any) => Number(p.salePrice ?? p.price);
  const unitOf = (p: any) => (monthly ? r2(shopUnit(p) * (1 - config.monthlyDiscount / 100)) : shopUnit(p));

  const cats = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of products) if (p.category) m.set(p.category.slug, p.category);
    return [...m.values()];
  }, [products]);
  const shown = cat ? products.filter((p) => p.category?.slug === cat) : products;

  // What's in the box, priced.
  const lines = products.filter((p) => picks[p.id] > 0).map((p) => ({ p, q: picks[p.id], total: r2(unitOf(p) * picks[p.id]) }));
  const count = lines.reduce((n, l) => n + l.q, 0);
  const itemsTotal = r2(lines.reduce((n, l) => n + l.total, 0));
  const fullTotal = r2(lines.reduce((n, l) => n + shopUnit(l.p) * l.q, 0));
  const fee = count ? config.packingFee : 0;
  const total = r2(itemsTotal + fee);
  const need = Math.max(0, config.minItems - count);

  const setQty = (id: string, q: number) => { setError(''); setPicks((x) => { const n = { ...x }; if (q > 0) n[id] = q; else delete n[id]; return n; }); };

  async function submit() {
    if (need || busy) return;
    setBusy(true); setError('');
    try {
      await addBox(lines.map((l) => ({ productId: l.p.id, quantity: l.q })), monthly, editId ?? undefined);
      try { localStorage.removeItem(DRAFT); } catch {}
      router.push('/cart');
    } catch (e: any) {
      setError(e?.message || t('pdp.addError'));
      setBusy(false);
    }
  }

  const thumb = (p: any, cls: string) => {
    const img = p.images?.[0];
    const look = categoryLook(p.category);
    return (
      <span className={`shrink-0 overflow-hidden flex items-center justify-center ${img ? 'bg-gray-50' : `bg-gradient-to-br ${look.tint}`} ${cls}`}>
        {img ? <img src={img.url} alt="" className="w-full h-full object-cover" /> : <span aria-hidden="true">{look.icon}</span>}
      </span>
    );
  };

  /** The box: progress, contents, price and the button. Beside the grid, or in the phone sheet. */
  const summary = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center"><Icon name="box" className="w-5 h-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-gray-900 leading-tight">{t('cb.yourBox')}</p>
          <p className="text-[12px] text-gray-500">{fill(t('cb.items'), { n: count })}{monthly && <> · {t('cb.monthly')}</>}</p>
        </div>
        {count > 0 && (
          <button type="button" onClick={() => setPicks({})} aria-label={t('cb.clear')} title={t('cb.clear')}
            className="w-9 h-9 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center"><Icon name="trash" className="w-4 h-4" /></button>
        )}
      </div>

      {/* How far to a full box */}
      <div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${need ? 'bg-teal-300' : 'bg-teal-500'}`} style={{ width: `${Math.min(100, (count / config.minItems) * 100)}%` }} />
        </div>
        <p className={`mt-1.5 text-[12px] font-semibold ${need ? 'text-gray-500' : 'text-teal-700'}`}>
          {need ? fill(t('cb.need'), { n: need }) : <span className="inline-flex items-center gap-1"><Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.6} />{t('cb.ready')}</span>}
        </p>
      </div>

      {lines.length === 0 ? (
        <p className="text-[13px] text-gray-400 py-2">{t('cb.empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-100 -my-1">
          {lines.map((l) => (
            <li key={l.p.id} className="flex items-center gap-2.5 py-2">
              {thumb(l.p, 'w-10 h-10 rounded-xl text-lg')}
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-gray-800 line-clamp-1">{nameOf(l.p)}</p>
                <p className="text-[12px] text-gray-500 tabular-nums">{money(l.total)}</p>
              </div>
              <QuantityStepper value={l.q} max={available(l.p.inventory)} trashAtOne
                onLess={() => setQty(l.p.id, l.q - 1)} onMore={() => setQty(l.p.id, l.q + 1)} />
            </li>
          ))}
        </ul>
      )}

      <dl className="space-y-1.5 text-[13px] border-t border-gray-100 pt-3">
        <div className="flex justify-between text-gray-500"><dt>{t('cb.products')}</dt><dd className="tabular-nums">{money(monthly ? fullTotal : itemsTotal)}</dd></div>
        {monthly && fullTotal > itemsTotal && (
          <div className="flex justify-between text-teal-700"><dt>{t('cb.saving')} (−{config.monthlyDiscount}%)</dt><dd className="tabular-nums">−{money(r2(fullTotal - itemsTotal))}</dd></div>
        )}
        {fee > 0 && <div className="flex justify-between text-gray-500"><dt>{t('cb.packing')}</dt><dd className="tabular-nums">{money(fee)}</dd></div>}
        <div className="flex justify-between items-baseline pt-1.5">
          <dt className="font-bold text-gray-900">{t('cb.total')}</dt>
          <dd className="text-[19px] font-extrabold text-gray-900 tabular-nums">{money(total)}{monthly && <span className="text-[12px] font-semibold text-gray-500"> {t('cb.perMonth')}</span>}</dd>
        </div>
      </dl>

      {error && <FieldError message={error} />}
      <button type="button" onClick={submit} disabled={!!need || busy}
        className="h-11 rounded-full bg-teal-600 text-white text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors disabled:bg-gray-100 disabled:text-gray-400">
        {busy ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Icon name="bag" className="w-[18px] h-[18px]" strokeWidth={2.2} />}
        {editId ? t('cb.save') : t('cb.add')}
      </button>
      {monthly && <p className="text-[11.5px] leading-relaxed text-gray-500 -mt-1">{fill(t('cb.monthlyNote'), { n: config.monthlyDiscount })}</p>}
    </div>
  );

  return (
    <main className="min-h-screen bg-white">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 ${PAGE_TOP} pb-32 lg:pb-14`}>
        <Heading title={editId ? t('cb.edit') : t('cb.title')} subtitle={fill(t('cb.sub'), { n: config.minItems })} />

        {/* Once or every month: a pill slides under the chosen one. */}
        <div role="radiogroup" aria-label={`${t('cb.once')} / ${t('cb.monthly')}`} className="relative inline-grid grid-cols-2 p-1 rounded-full bg-gray-100 mb-6">
          <span aria-hidden="true" className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)] ${monthly ? 'translate-x-full' : ''}`} />
          {([[false, t('cb.once')], [true, t('cb.monthly')]] as const).map(([m, label]) => (
            <button key={String(m)} type="button" role="radio" aria-checked={monthly === m} onClick={() => setMonthly(m)}
              className={`relative z-10 px-5 sm:px-6 py-2 rounded-full text-[13.5px] font-bold whitespace-nowrap transition-colors ${monthly === m ? 'text-teal-700' : 'text-gray-500 hover:text-gray-800'}`}>
              {label}
              {m && config.monthlyDiscount > 0 && <span className="ml-1.5 text-[11px] font-extrabold text-peach-600">{fill(t('cb.off'), { n: config.monthlyDiscount })}</span>}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8 items-start [&>*]:min-w-0">
          <div>
            {/* Categories */}
            {cats.length > 1 && (
              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[{ slug: '', name: t('cb.all') }, ...cats].map((c: any) => {
                  const on = cat === c.slug;
                  return (
                    <button key={c.slug || 'all'} type="button" onClick={() => setCat(c.slug)} aria-pressed={on}
                      className={`shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${on ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200' : 'bg-white text-gray-600 ring-1 ring-gray-200/80 hover:bg-teal-50/40 hover:text-teal-700'}`}>
                      {c.slug ? ((lang === 'ka' && c.translations?.ka?.name) || c.name) : c.name}
                    </button>
                  );
                })}
              </div>
            )}

            {products.length === 0 ? (
              <p className="text-center text-[14px] text-gray-500 py-16">{t('cb.none')}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {shown.map((p, i) => {
                  const q = picks[p.id] ?? 0;
                  const left = available(p.inventory);
                  const out = left === 0;
                  const low = !out && left <= Number(p.inventory?.lowStockAlert || 0);
                  return (
                    <div key={p.id} className={`relative flex flex-col rounded-3xl p-2 sm:p-2.5 transition-all animate-[fadeUp_0.35s_ease-out_both] ${
                      out ? 'bg-gray-50/80 ring-1 ring-gray-100' : q ? 'bg-white ring-2 ring-teal-200' : 'bg-white ring-1 ring-gray-100 hover:ring-teal-200'}`} style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
                      <div className="relative">
                        {thumb(p, `w-full aspect-[4/3] rounded-2xl text-[40px] ${out ? 'grayscale opacity-50' : ''}`)}
                        {q > 0 && <span key={q} className="absolute top-2 right-2 min-w-[26px] h-[26px] px-1.5 rounded-full bg-white/95 text-teal-700 text-[12px] font-extrabold flex items-center justify-center ring-1 ring-teal-100 animate-[pop_0.25s_ease-out]">{q}</span>}
                        {low && <span className="absolute top-2 left-2 text-[10.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">{fill(t('cb.leftOnly'), { n: left })}</span>}
                      </div>
                      <p className={`px-1 pt-2.5 text-[13px] font-bold leading-snug line-clamp-2 flex-1 ${out ? 'text-gray-400' : 'text-gray-900'}`}>{nameOf(p)}</p>
                      <div className="px-1 pt-2 pb-0.5 flex items-center justify-between gap-2">
                        <div className="leading-none min-w-0">
                          <span className={`text-[14.5px] font-extrabold tabular-nums ${out ? 'text-gray-400' : monthly ? 'text-teal-700' : 'text-gray-900'}`}>{money(unitOf(p))}</span>
                          {monthly && config.monthlyDiscount > 0 && <span className="block sm:inline sm:ml-1.5 mt-0.5 text-[11px] text-gray-400 line-through tabular-nums">{money(shopUnit(p))}</span>}
                        </div>
                        {out ? (
                          <span title={t('shop.outOfStock')} className="w-9 h-9 shrink-0 rounded-full bg-gray-100 text-gray-300 flex items-center justify-center"><Icon name="ban" className="w-[18px] h-[18px]" strokeWidth={2.2} /></span>
                        ) : q ? (
                          <QuantityStepper value={q} max={left} trashAtOne onLess={() => setQty(p.id, q - 1)} onMore={() => setQty(p.id, q + 1)} />
                        ) : (
                          <button type="button" onClick={() => setQty(p.id, 1)} aria-label={`${t('shop.quickAdd')}: ${nameOf(p)}`} title={t('shop.quickAdd')}
                            className="w-9 h-9 shrink-0 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center hover:bg-teal-100 active:scale-90 transition">
                            <Icon name="plus" className="w-[18px] h-[18px]" strokeWidth={2.4} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* The box, beside the products on wide screens */}
          <aside className="hidden lg:block sticky top-24 rounded-3xl bg-gray-50 p-5">{summary}</aside>
        </div>
      </div>

      {/* Phones and tablets: the box in a bar at the bottom; tap for the full list */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <button type="button" onClick={() => setSheet(true)} aria-label={t('cb.view')} className="flex-1 min-w-0 flex items-center gap-3 text-left">
            <span className="relative w-11 h-11 shrink-0 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Icon name="box" className="w-5 h-5" />
              {count > 0 && <span key={count} className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center animate-[pop_0.25s_ease-out]">{count}</span>}
            </span>
            <span className="min-w-0">
              <span className={`block text-[12px] font-semibold ${need ? 'text-gray-500' : 'text-teal-700'}`}>{need ? fill(t('cb.need'), { n: need }) : t('cb.ready')}</span>
              <span className="block text-[16px] font-extrabold text-gray-900 tabular-nums">{money(total)}{monthly && <span className="text-[11px] font-semibold text-gray-500"> {t('cb.perMonth')}</span>}</span>
            </span>
          </button>
          <button type="button" onClick={need ? () => setSheet(true) : submit} disabled={busy}
            className={`h-11 px-5 rounded-full text-[13.5px] font-bold flex items-center gap-2 transition-colors ${need ? 'bg-teal-50 text-teal-700' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
            {busy ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Icon name={need ? 'box' : 'bag'} className="w-[18px] h-[18px]" strokeWidth={2.2} />}
            {need ? t('cb.view') : editId ? t('cb.save') : t('cb.add')}
          </button>
        </div>
      </div>
      <Modal open={sheet} onClose={() => setSheet(false)} title={t('cb.yourBox')}>{summary}</Modal>
    </main>
  );
}
