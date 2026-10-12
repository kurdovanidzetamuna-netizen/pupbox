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
import { categoryLook } from '@/lib/shopIcons';
import { available } from '@/lib/useChoice';

type Config = { minItems: number; packingFee: number; monthlyDiscount: number; mystery: { enabled: boolean; price: number; max: number } };
const money = (n: number) => `₾${n.toFixed(2)}`;
const r2 = (n: number) => Math.round(n * 100) / 100;
const DRAFT = 'pupbox_box_draft';
const MYSTERY = '__mystery__';

/**
 * Build-your-own box, made to play with: choose once or every month, then tap
 * treats and they drop into the box — empty spots show how many are still
 * needed, the box cheers as it fills, and a mystery surprise can go in too
 * (admin picks it when packing). Editing a box from the basket replaces it.
 */
export default function BuildBoxView({ products, config: raw }: { products: any[]; config: Config }) {
  // Older settings have no mystery part: then there's no surprise to offer.
  const config: Config = { ...raw, mystery: raw.mystery ?? { enabled: false, price: 0, max: 0 } };
  const { t, lang } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const { cart, ready, addBox } = useCart();
  const editId = params.get('edit');
  const mysteryOn = config.mystery.enabled && config.mystery.max > 0;

  const [monthly, setMonthly] = useState(params.get('monthly') === '1');
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [mystery, setMystery] = useState(0);
  const [cat, setCat] = useState('');
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // The last tile tapped, for its "+1" and the box's newest item to drop in.
  const [bump, setBump] = useState<{ id: string; n: number } | null>(null);
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
        setMystery(line.customBox.mysteryCount ?? 0);
        setMonthly(!!line.customBox.monthly);
      }
    } else {
      try {
        const d = JSON.parse(localStorage.getItem(DRAFT) || 'null');
        if (d?.picks) { setPicks(d.picks); setMystery(Number(d.mystery) || 0); if (params.get('monthly') == null) setMonthly(!!d.monthly); }
      } catch {}
    }
    loaded.current = true;
  }, [editId, ready, cart, params]);
  useEffect(() => {
    if (!loaded.current || editId) return;
    try { localStorage.setItem(DRAFT, JSON.stringify({ picks, mystery, monthly })); } catch {}
  }, [picks, mystery, monthly, editId]);

  const nameOf = (p: any) => (lang === 'ka' && p.translations?.ka?.name?.trim()) || p.name;
  const off = (n: number) => (monthly ? r2(n * (1 - config.monthlyDiscount / 100)) : n);
  const shopUnit = (p: any) => Number(p.salePrice ?? p.price);

  const cats = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of products) if (p.category) m.set(p.category.slug, p.category);
    return [...m.values()];
  }, [products]);
  const shown = cat ? products.filter((p) => p.category?.slug === cat) : products;

  // What's in the box, priced.
  const lines = products.filter((p) => picks[p.id] > 0).map((p) => ({ p, q: picks[p.id], total: r2(off(shopUnit(p)) * picks[p.id]) }));
  const mysteryUnit = off(config.mystery?.price ?? 0);
  const count = lines.reduce((n, l) => n + l.q, 0) + mystery;
  const itemsTotal = r2(lines.reduce((n, l) => n + l.total, 0) + mysteryUnit * mystery);
  const fullTotal = r2(lines.reduce((n, l) => n + shopUnit(l.p) * l.q, 0) + (config.mystery?.price ?? 0) * mystery);
  const fee = count ? config.packingFee : 0;
  const total = r2(itemsTotal + fee);
  const need = Math.max(0, config.minItems - count);
  const mood = count === 0 ? t('cb.mood0') : need ? fill(t('cb.mood1'), { n: need }) : count >= config.minItems + 3 ? t('cb.mood3') : t('cb.mood2');

  const add = (id: string, max: number) => {
    setError('');
    if (id === MYSTERY) {
      if (mystery >= Math.min(max, config.mystery.max)) return;
      setMystery((m) => m + 1);
    } else {
      if ((picks[id] ?? 0) >= max) return;
      setPicks((x) => ({ ...x, [id]: (x[id] ?? 0) + 1 }));
    }
    setBump((b) => ({ id, n: (b?.n ?? 0) + 1 }));
  };
  const less = (id: string) => {
    setError('');
    if (id === MYSTERY) return setMystery((m) => Math.max(0, m - 1));
    setPicks((x) => { const n = { ...x }; if ((n[id] ?? 0) > 1) n[id]--; else delete n[id]; return n; });
  };

  async function submit() {
    if (need || busy) return;
    setBusy(true); setError('');
    try {
      await addBox(lines.map((l) => ({ productId: l.p.id, quantity: l.q })), monthly, mystery, editId ?? undefined);
      try { localStorage.removeItem(DRAFT); } catch {}
      router.push('/cart');
    } catch (e: any) {
      setError(e?.message || t('pdp.addError'));
      setBusy(false);
    }
  }

  /** A product's picture: its photo, or its category's icon on a soft colour. */
  const face = (p: any, cls: string) => {
    const img = p.images?.[0];
    const look = categoryLook(p.category);
    return (
      <span className={`shrink-0 overflow-hidden flex items-center justify-center ${img ? 'bg-white' : `bg-gradient-to-br ${look.tint}`} ${cls}`}>
        {img ? <img src={img.url} alt="" className="w-full h-full object-cover" /> : <span aria-hidden="true">{look.icon}</span>}
      </span>
    );
  };

  // Every unit in the box as its own little tile (newest last), then empty spots up to the minimum.
  const units: { key: string; id: string; p?: any }[] = [];
  for (const l of lines) for (let i = 0; i < l.q; i++) units.push({ key: `${l.p.id}-${i}`, id: l.p.id, p: l.p });
  for (let i = 0; i < mystery; i++) units.push({ key: `m-${i}`, id: MYSTERY });
  const slots = Math.max(0, config.minItems - units.length);

  /** The box: its contents dropping in, empty spots, mood, price and the button. */
  const theBox = (
    <div className="flex flex-col gap-4">
      {/* The open box */}
      <div className="relative pt-5">
        {/* Flaps */}
        <span aria-hidden="true" className="absolute left-3 top-0 w-[38%] h-6 rounded-t-2xl bg-teal-100 -rotate-[8deg] origin-bottom-right" />
        <span aria-hidden="true" className="absolute right-3 top-0 w-[38%] h-6 rounded-t-2xl bg-teal-100 rotate-[8deg] origin-bottom-left" />
        <div className="relative rounded-3xl bg-teal-50 ring-2 ring-teal-100 p-3 min-h-[148px]">
          <div className="flex flex-wrap gap-2">
            {units.map((u, i) => (
              <button key={u.key} type="button" onClick={() => less(u.id)} title={t('cb.remove')} aria-label={`${t('cb.remove')}: ${u.p ? nameOf(u.p) : t('cb.mystery')}`}
                className={`group relative w-12 h-12 rounded-2xl ${i === units.length - 1 && bump ? 'animate-[dropIn_0.45s_ease-out]' : ''}`}>
                {u.p ? face(u.p, 'w-12 h-12 rounded-2xl text-[22px] ring-2 ring-white')
                  : <span className="w-12 h-12 rounded-2xl bg-peach-50 ring-2 ring-white text-peach-600 flex items-center justify-center text-[20px] font-extrabold">?</span>}
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-gray-400 ring-1 ring-gray-200 hidden group-hover:flex items-center justify-center"><Icon name="minus" className="w-3 h-3" strokeWidth={2.6} /></span>
              </button>
            ))}
            {Array.from({ length: slots }).map((_, i) => (
              <span key={`s${i}`} title={t('cb.slot')} className="w-12 h-12 rounded-2xl border-2 border-dashed border-teal-200 flex items-center justify-center text-teal-300">
                <Icon name="plus" className="w-4 h-4" strokeWidth={2.4} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <p key={mood} className={`text-[14px] font-bold animate-[fadeUp_0.3s_ease-out] ${need ? 'text-gray-700' : 'text-teal-700'}`}>{mood}</p>

      <dl className="space-y-1.5 text-[13px]">
        <div className="flex justify-between text-gray-500"><dt>{fill(t('cb.items'), { n: count })}</dt><dd className="tabular-nums">{money(monthly ? fullTotal : itemsTotal)}</dd></div>
        {monthly && fullTotal > itemsTotal && (
          <div className="flex justify-between text-teal-700"><dt>{t('cb.saving')} (−{config.monthlyDiscount}%)</dt><dd className="tabular-nums">−{money(r2(fullTotal - itemsTotal))}</dd></div>
        )}
        {fee > 0 && <div className="flex justify-between text-gray-500"><dt>{t('cb.packing')}</dt><dd className="tabular-nums">{money(fee)}</dd></div>}
        <div className="flex justify-between items-baseline pt-1.5 border-t border-gray-100">
          <dt className="font-bold text-gray-900">{t('cb.total')}</dt>
          <dd className="text-[20px] font-extrabold text-gray-900 tabular-nums">{money(total)}{monthly && <span className="text-[12px] font-semibold text-gray-500"> {t('cb.perMonth')}</span>}</dd>
        </div>
      </dl>

      {error && <FieldError message={error} />}
      <button type="button" onClick={submit} disabled={!!need || busy}
        className={`h-12 rounded-full text-[14.5px] font-bold flex items-center justify-center gap-2 transition-all ${need ? 'bg-gray-100 text-gray-400' : 'bg-teal-600 text-white hover:bg-teal-700 animate-[pop_0.35s_ease-out]'}`}>
        {busy ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Icon name="bag" className="w-[18px] h-[18px]" strokeWidth={2.2} />}
        {editId ? t('cb.save') : t('cb.add')}
      </button>
      {monthly && <p className="text-[11.5px] leading-relaxed text-gray-500 -mt-1">{fill(t('cb.monthlyNote'), { n: config.monthlyDiscount })}</p>}
    </div>
  );

  /** A treat to tap: the whole card adds one; − takes one out. */
  const tile = (key: string, opts: { id: string; name: string; price: number; was?: number; q: number; max: number; picture: React.ReactNode; mystery?: boolean; note?: string }, i: number) => {
    const out = opts.max === 0;
    const full = !out && opts.q >= opts.max;
    return (
      <div key={key} className="relative animate-[fadeUp_0.35s_ease-out_both]" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
        <button type="button" onClick={() => add(opts.id, opts.max)} disabled={out || full} aria-label={`${t('shop.quickAdd')}: ${opts.name}`}
          className={`group w-full h-full text-left flex flex-col rounded-3xl p-2.5 transition-all active:scale-[0.97] ${
            opts.mystery ? 'bg-peach-50/70 ring-2 ring-dashed ring-peach-200 hover:ring-peach-300'
              : out ? 'bg-gray-50 ring-1 ring-gray-100 cursor-not-allowed'
              : opts.q ? 'bg-white ring-2 ring-teal-300' : 'bg-white ring-1 ring-gray-100 hover:ring-teal-200 hover:-translate-y-0.5'}`}>
          <span className={`relative block ${opts.mystery ? 'animate-[wiggle_2.4s_ease-in-out_infinite]' : 'group-hover:animate-[wiggle_0.6s_ease-in-out]'}`}>{opts.picture}</span>
          <span className={`px-1 pt-2.5 text-[13px] font-bold leading-snug line-clamp-2 ${out ? 'text-gray-400' : 'text-gray-900'}`}>{opts.name}</span>
          {opts.note && <span className="px-1 pt-0.5 text-[11.5px] text-gray-500 leading-snug line-clamp-2">{opts.note}</span>}
          <span className="px-1 pt-1.5 mt-auto flex items-baseline gap-1.5">
            <span className={`text-[14px] font-extrabold tabular-nums ${out ? 'text-gray-400' : opts.mystery ? 'text-peach-600' : monthly ? 'text-teal-700' : 'text-gray-900'}`}>{money(opts.price)}</span>
            {opts.was != null && opts.was > opts.price && <span className="text-[11px] text-gray-400 line-through tabular-nums">{money(opts.was)}</span>}
          </span>
          {out && <span className="absolute inset-x-3 top-3 text-center text-[11px] font-bold text-white bg-gray-500/80 rounded-full py-0.5">{t('shop.outOfStock')}</span>}
        </button>
        {/* How many are in, and one out */}
        {opts.q > 0 && (
          <span className="absolute top-1.5 right-1.5 flex items-center gap-1">
            <button type="button" onClick={() => less(opts.id)} aria-label={`${t('cb.remove')}: ${opts.name}`} title={t('cb.remove')}
              className="w-7 h-7 rounded-full bg-white/95 text-gray-500 ring-1 ring-gray-200 flex items-center justify-center hover:text-red-500 hover:ring-red-200"><Icon name="minus" className="w-3.5 h-3.5" strokeWidth={2.6} /></button>
            <span key={opts.q} className="min-w-[28px] h-7 px-1.5 rounded-full bg-teal-600 text-white text-[12.5px] font-extrabold flex items-center justify-center animate-[pop_0.3s_ease-out]">{opts.q}</span>
          </span>
        )}
        {bump?.id === opts.id && (
          <span key={bump.n} aria-hidden="true" className="pointer-events-none absolute left-1/2 top-8 text-[15px] font-extrabold text-teal-600 animate-[floatUp_0.7s_ease-out_forwards]">+1</span>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-white">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 ${PAGE_TOP} pb-32 lg:pb-14`}>
        <Heading title={editId ? t('cb.edit') : t('cb.title')} subtitle={fill(t('cb.sub'), { n: config.minItems })} />

        {/* Step 1: once or every month */}
        <p className="text-[12px] font-bold uppercase tracking-wider text-teal-700/70 mb-2.5"><span className="mr-1.5">1</span>{t('cb.step1')}</p>
        <div role="radiogroup" aria-label={t('cb.step1')} className="grid grid-cols-2 gap-3 max-w-xl mb-8">
          {([[false, 'box', t('cb.once'), t('cb.onceSub')], [true, 'repeat', t('cb.monthly'), fill(t('cb.monthlySub'), { n: config.monthlyDiscount })]] as const).map(([m, icon, title, sub]) => {
            const on = monthly === m;
            return (
              <button key={String(m)} type="button" role="radio" aria-checked={on} onClick={() => setMonthly(m)}
                className={`relative text-left rounded-3xl p-3.5 sm:p-4 transition-all ${on ? 'bg-teal-50 ring-2 ring-teal-300' : 'bg-white ring-1 ring-gray-200/80 hover:ring-teal-200'}`}>
                <span className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 ${on ? 'bg-white text-teal-600' : 'bg-gray-50 text-gray-500'}`}><Icon name={icon} className="w-5 h-5" /></span>
                <span className="block text-[14.5px] font-bold text-gray-900">{title}</span>
                <span className="block text-[12px] text-gray-500 mt-0.5 leading-snug">{sub}</span>
                {m && config.monthlyDiscount > 0 && <span className="absolute top-3 right-3 text-[11px] font-extrabold text-peach-600 bg-peach-50 rounded-full px-2 py-0.5">−{config.monthlyDiscount}%</span>}
                {on && <span className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center"><Icon name="check" className="w-3 h-3" strokeWidth={3} /></span>}
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-10 items-start [&>*]:min-w-0">
          <div>
            {/* Step 2: fill it */}
            <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-teal-700/70"><span className="mr-1.5">2</span>{t('cb.step2')}</p>
                <p className="text-[13px] text-gray-500 mt-1 flex items-center gap-1.5"><Icon name="sparkle" className="w-4 h-4 text-teal-500" />{t('cb.tapHint')}</p>
              </div>
              {cats.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[{ slug: '', name: t('cb.all') }, ...cats].map((c: any) => {
                    const on = cat === c.slug;
                    const look = c.slug ? categoryLook(c) : null;
                    return (
                      <button key={c.slug || 'all'} type="button" onClick={() => setCat(c.slug)} aria-pressed={on}
                        className={`shrink-0 h-9 pl-2 pr-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${on ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200' : 'bg-white text-gray-600 ring-1 ring-gray-200/80 hover:bg-teal-50/40'}`}>
                        <span className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-[13px]" aria-hidden="true">{look ? look.icon : <Icon name="paw" className="w-3.5 h-3.5 text-teal-600" />}</span>
                        {c.slug ? ((lang === 'ka' && c.translations?.ka?.name) || c.name) : c.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {products.length === 0 && !mysteryOn ? (
              <p className="text-center text-[14px] text-gray-500 py-16">{t('cb.none')}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {/* The surprise first: it's the fun one. */}
                {mysteryOn && !cat && tile('mystery', {
                  id: MYSTERY, name: t('cb.mystery'), note: t('cb.mysterySub'), q: mystery, max: config.mystery.max, mystery: true,
                  price: mysteryUnit, was: monthly ? config.mystery.price : undefined,
                  picture: (
                    <span className="relative w-full aspect-[4/3] rounded-2xl bg-white flex items-center justify-center text-peach-500">
                      <Icon name="gift" className="w-12 h-12" strokeWidth={1.5} />
                      <span className="absolute top-2 left-2 text-[11px] font-extrabold text-peach-600 bg-peach-50 rounded-full px-2 py-0.5">{fill(t('cb.mysteryMax'), { n: config.mystery.max })}</span>
                      <span className="absolute right-[30%] top-[22%] text-[22px] font-black text-peach-400">?</span>
                    </span>
                  ),
                }, 0)}
                {shown.map((p, i) => tile(p.id, {
                  id: p.id, name: nameOf(p), q: picks[p.id] ?? 0, max: available(p.inventory),
                  price: off(shopUnit(p)), was: monthly ? shopUnit(p) : undefined,
                  picture: face(p, 'w-full aspect-[4/3] rounded-2xl text-[42px]'),
                }, i + 1))}
              </div>
            )}
          </div>

          {/* The box, beside the treats on wide screens */}
          <aside className="hidden lg:block sticky top-24 rounded-3xl bg-white ring-1 ring-gray-100 p-5">
            <p className="text-[15px] font-bold text-gray-900 mb-1 flex items-center gap-2"><Icon name="box" className="w-5 h-5 text-teal-600" />{t('cb.yourBox')}</p>
            {theBox}
          </aside>
        </div>
      </div>

      {/* Phones and tablets: the box in a bar at the bottom; tap for the whole box */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <button type="button" onClick={() => setSheet(true)} aria-label={t('cb.view')} className="flex-1 min-w-0 flex items-center gap-3 text-left">
            <span key={count} className="relative w-11 h-11 shrink-0 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center animate-[pop_0.3s_ease-out]">
              <Icon name="box" className="w-5 h-5" />
              {count > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">{count}</span>}
            </span>
            <span className="min-w-0">
              <span className={`block text-[12px] font-semibold truncate ${need ? 'text-gray-500' : 'text-teal-700'}`}>{mood}</span>
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
      <Modal open={sheet} onClose={() => setSheet(false)} title={t('cb.yourBox')}>{theBox}</Modal>
    </main>
  );
}
