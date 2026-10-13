'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { fill } from '@/context/strings/purchase';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/icons';
import { GlossyBuild, GlossyPaw } from '@/components/Glossy3D';
import EmptyState from '@/components/ui/EmptyState';
import { FieldError } from '@/components/ui/FormError';
import { available } from '@/lib/useChoice';

type Config = { minItems: number; packingFee: number; monthlyDiscount: number; mystery: { enabled: boolean; price: number; max: number } };
const money = (n: number) => `₾${n.toFixed(2)}`;
const r2 = (n: number) => Math.round(n * 100) / 100;
const DRAFT = 'pupbox_box_draft';
const MYSTERY = '__mystery__';

/**
 * Build-your-own box, as it always looked: a catalogue of box items (its
 * own, from admin → Custom box items — not the shop) as small emoji cards
 * with "+ Add", and beside it the box: how full it is, what's in it, the
 * price and the order button. Once or every month (with a discount), and a
 * mystery surprise admin picks when packing. Editing from the basket
 * replaces that box.
 */
export default function BuildBoxView({ products, config: raw }: { products: any[]; config: Config }) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const { cart, ready, addBox } = useCart();
  const editId = params.get('edit');
  // Older settings have no mystery part: then there's no surprise to offer.
  const config: Config = { ...raw, mystery: raw.mystery ?? { enabled: false, price: 0, max: 0 } };
  const mysteryOn = config.mystery.enabled && config.mystery.max > 0;

  const [monthly, setMonthly] = useState(params.get('monthly') === '1');
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [mystery, setMystery] = useState(0);
  const [cat, setCat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const summaryRef = useRef<HTMLDivElement>(null);
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
  const lineOf = (p: any) => (lang === 'ka' && p.translations?.ka?.shortDescription?.trim()) || p.shortDescription || '';
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
  const mysteryUnit = off(config.mystery.price);
  const count = lines.reduce((n, l) => n + l.q, 0) + mystery;
  const itemsTotal = r2(lines.reduce((n, l) => n + l.total, 0) + mysteryUnit * mystery);
  const fullTotal = r2(lines.reduce((n, l) => n + shopUnit(l.p) * l.q, 0) + config.mystery.price * mystery);
  const fee = count ? config.packingFee : 0;
  const total = r2(itemsTotal + fee);
  const need = Math.max(0, config.minItems - count);

  const add = (id: string, max: number) => {
    setError('');
    if (id === MYSTERY) return setMystery((m) => Math.min(config.mystery.max, m + 1));
    setPicks((x) => ((x[id] ?? 0) >= max ? x : { ...x, [id]: (x[id] ?? 0) + 1 }));
  };
  const less = (id: string) => {
    setError('');
    if (id === MYSTERY) return setMystery((m) => Math.max(0, m - 1));
    setPicks((x) => { const n = { ...x }; if ((n[id] ?? 0) > 1) n[id]--; else delete n[id]; return n; });
  };
  const drop = (id: string) => (id === MYSTERY ? setMystery(0) : setPicks((x) => { const n = { ...x }; delete n[id]; return n; }));

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

  /** One catalogue card: emoji, name, line, price; − and "+ Add". */
  const card = (o: { id: string; emoji: string; name: string; line: string; price: number; was?: number; q: number; max: number; popular?: boolean; mystery?: boolean }) => {
    const inBox = o.q > 0;
    const out = o.max === 0;
    return (
      <div key={o.id} className={`relative rounded-2xl p-4 transition-all ${
        o.mystery ? 'bg-peach-50/60 ring-2 ring-peach-200' : out ? 'bg-gray-50 ring-1 ring-gray-100' : inBox ? 'bg-white ring-2 ring-teal-300' : 'bg-white ring-1 ring-gray-100 hover:ring-gray-200'}`}>
        {inBox ? (
          <span key={o.q} className={`absolute -top-2 -right-2 text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-[pop_0.3s_ease-out] ${o.mystery ? 'bg-peach-400' : 'bg-teal-600'}`}>{fill(t('cb.added'), { n: o.q })}</span>
        ) : o.mystery ? (
          <span className="absolute -top-2 -right-2 bg-peach-400 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{t('cb.secret')}</span>
        ) : o.popular ? (
          <span className="absolute -top-2 -right-2 bg-amber-400 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{t('cb.popular')}</span>
        ) : null}
        <div className="flex items-start gap-3">
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center text-[22px] shrink-0 transition-colors ${o.mystery ? 'bg-white' : inBox ? 'bg-teal-50' : 'bg-gray-50'} ${out ? 'grayscale opacity-50' : ''}`} aria-hidden="true">{o.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-[13.5px] leading-tight ${out ? 'text-gray-400' : 'text-gray-900'}`}>{o.name}</p>
            {o.line && <p className="text-gray-400 text-[12px] mt-0.5 leading-snug">{o.line}</p>}
            <p className="mt-1.5 flex items-baseline gap-1.5">
              <span className={`font-extrabold text-[13.5px] ${o.mystery ? 'text-peach-600' : 'text-teal-600'}`}>₾{o.price % 1 ? o.price.toFixed(2) : o.price}</span>
              {o.was != null && o.was > o.price && <span className="text-[11px] text-gray-400 line-through">₾{o.was % 1 ? o.was.toFixed(2) : o.was}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-3">
          {out ? (
            <span className="text-[12px] font-semibold text-gray-400">{t('shop.outOfStock')}</span>
          ) : (<>
            {inBox && (
              <button type="button" onClick={() => less(o.id)} aria-label={`${t('cb.remove')}: ${o.name}`}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-500 font-bold text-base flex items-center justify-center transition-colors">−</button>
            )}
            <button type="button" onClick={() => add(o.id, o.max)} disabled={o.q >= o.max}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors disabled:opacity-40 ${
                o.mystery ? (inBox ? 'bg-peach-400 text-white hover:bg-peach-500' : 'bg-white text-peach-600 hover:bg-peach-400 hover:text-white')
                  : inBox ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white'}`}>
              {t('cb.addBtn')}
            </button>
          </>)}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-white">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-28 lg:pb-16">
        {/* Header */}
        <div className="text-center mb-7">
          <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-[12px] font-bold px-3.5 py-1.5 rounded-full mb-4"><Icon name="sparkle" className="w-3.5 h-3.5" />{t('cb.badge')}</span>
          <Heading align="center" title={editId ? t('cb.edit') : t('cb.heroTitle')} subtitle={fill(t('cb.heroSub'), { n: config.minItems })} className="!mb-0" />
        </div>

        {/* Once / every month */}
        <div className="flex justify-center mb-6">
          <div role="radiogroup" aria-label={`${t('cb.once')} / ${t('cb.monthly')}`} className="grid grid-cols-2 w-full max-w-sm sm:max-w-none sm:w-auto sm:inline-flex bg-gray-200/80 ring-1 ring-inset ring-gray-300/60 rounded-full p-1 gap-1">
            {([[false, 'box', t('cb.once')], [true, 'repeat', t('cb.monthly')]] as const).map(([m, icon, label]) => (
              <button key={String(m)} type="button" role="radio" aria-checked={monthly === m} onClick={() => setMonthly(m)}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-6 py-2.5 rounded-full text-[12.5px] sm:text-[13.5px] font-bold whitespace-nowrap transition-all ${monthly === m ? 'bg-white text-teal-700 shadow-[0_1px_4px_rgba(36,48,58,0.15)]' : 'text-gray-600 hover:text-gray-900'}`}>
                <Icon name={icon} className="w-[17px] h-[17px]" />{label}
                {m && config.monthlyDiscount > 0 && <span className="text-[11px] font-extrabold text-peach-600">−{config.monthlyDiscount}%</span>}
              </button>
            ))}
          </div>
        </div>

        {monthly && (
          <div className="max-w-2xl mx-auto mb-8 bg-teal-50 rounded-[20px] px-5 py-4 flex items-start gap-3.5 animate-[fadeUp_0.25s_ease-out]">
            <span className="w-9 h-9 shrink-0 rounded-xl bg-white text-teal-600 flex items-center justify-center"><Icon name="repeat" className="w-[18px] h-[18px]" /></span>
            <div>
              <p className="font-bold text-teal-800 text-[13.5px] mb-0.5">{t('cb.monthlyBanner')}</p>
              <p className="text-gray-600 text-[12.5px] leading-relaxed">{fill(t('cb.monthlyNote'), { n: config.monthlyDiscount })}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* ── Left: the box's own catalogue ── */}
          <div className="flex-1 min-w-0 w-full">
            {cats.length > 1 && (
              /* Categories: one row that scrolls sideways on phones, wraps on bigger screens */
              <div className="flex sm:flex-wrap gap-2 mb-4 sm:mb-5 overflow-x-auto sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[{ slug: '', name: t('cb.all') }, ...cats].map((c: any) => (
                  <button key={c.slug || 'all'} type="button" onClick={() => setCat(c.slug)} aria-pressed={cat === c.slug}
                    className={`shrink-0 h-9 px-4 rounded-full text-[12.5px] font-bold ring-1 ring-inset transition-colors ${cat === c.slug ? 'bg-teal-50 text-teal-700 ring-teal-400' : 'bg-white ring-gray-200 text-gray-600 hover:ring-gray-300'}`}>
                    {c.slug ? ((lang === 'ka' && c.translations?.ka?.name) || c.name) : c.name}
                  </button>
                ))}
              </div>
            )}

            {products.length === 0 && !mysteryOn ? (
              <EmptyState art="build" tint="bg-pastel-lilac" title={t('cb.none')} />
            ) : (
              /* Computers: the list scrolls inside its own area so the box stays beside it */
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2 lg:-mr-2 lg:pt-3 lg:-mt-3 [scrollbar-width:thin] [scrollbar-color:#BBEDE0_transparent]">
                {mysteryOn && !cat && card({ id: MYSTERY, emoji: '🎁', name: t('cb.mystery'), line: t('cb.mysterySub'), price: mysteryUnit, was: monthly ? config.mystery.price : undefined, q: mystery, max: config.mystery.max, mystery: true })}
                {shown.map((p) => card({
                  id: p.id, emoji: p.boxEmoji || '🐾', name: nameOf(p), line: lineOf(p), price: off(shopUnit(p)), was: monthly ? shopUnit(p) : undefined,
                  q: picks[p.id] ?? 0, max: available(p.inventory), popular: p.boxPopular,
                }))}
              </div>
            )}
          </div>

          {/* ── Right: the box ── */}
          <div ref={summaryRef} className="w-full lg:w-80 shrink-0 lg:sticky lg:top-24 scroll-mt-24">
            <div className="bg-white rounded-[24px] ring-1 ring-gray-100 overflow-hidden">
              <div className="bg-pastel-mint px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-700 text-[11.5px] font-bold">{t('cb.yourBox')}{monthly && ` · ${t('cb.monthly')}`}</p>
                    <p key={count} className="text-gray-900 font-extrabold text-lg mt-0.5 animate-[fadeUp_0.25s_ease-out]">{count === 0 ? t('cb.emptyBox') : fill(t('cb.items'), { n: count })}</p>
                  </div>
                  <GlossyBuild className="w-14 h-14 -my-1 -mr-1" />
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-[11.5px] text-gray-600 mb-1.5">
                    <span>{fill(t('cb.minOf'), { n: count, min: config.minItems })}</span>
                    {!need && <span className="text-teal-700 font-bold">{t('cb.readyShort')}</span>}
                  </div>
                  <div className="h-1.5 bg-white rounded-full overflow-hidden">
                    <div className="h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (count / config.minItems) * 100)}%` }} />
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                {count === 0 ? (
                  <div className="text-center py-6">
                    <GlossyPaw className="mx-auto w-12 h-12 mb-2" />
                    <p className="text-gray-400 text-[13px]">{t('cb.emptyPanel')}</p>
                  </div>
                ) : (
                  <div className="space-y-2 mb-5 max-h-56 overflow-y-auto pr-1">
                    {[...lines.map((l) => ({ id: l.p.id, emoji: l.p.boxEmoji || '🐾', name: nameOf(l.p), q: l.q, total: l.total })),
                      ...(mystery ? [{ id: MYSTERY, emoji: '🎁', name: t('cb.mystery'), q: mystery, total: r2(mysteryUnit * mystery) }] : [])].map((x) => (
                      <div key={x.id} className="flex items-center justify-between gap-2 text-[13px] animate-[fadeUp_0.2s_ease-out]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0" aria-hidden="true">{x.emoji}</span>
                          <span className="text-gray-700 font-medium truncate">{x.name}</span>
                          {x.q > 1 && <span className="text-[11.5px] text-gray-400 shrink-0">×{x.q}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-teal-600 tabular-nums">{money(x.total)}</span>
                          <button type="button" onClick={() => drop(x.id)} aria-label={`${t('shop.uncheck')}: ${x.name}`} className="text-gray-300 hover:text-red-400 transition-colors text-xs">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {count > 0 && (
                  <div className="border-t border-gray-100 pt-4 space-y-2 text-[13px] mb-5">
                    <div className="flex justify-between text-gray-500"><span>{fill(t('cb.items'), { n: count })}</span><span className="tabular-nums">{money(monthly ? fullTotal : itemsTotal)}</span></div>
                    {monthly && fullTotal > itemsTotal && <div className="flex justify-between text-teal-700"><span>{t('cb.saving')} (−{config.monthlyDiscount}%)</span><span className="tabular-nums">−{money(r2(fullTotal - itemsTotal))}</span></div>}
                    {fee > 0 && <div className="flex justify-between text-gray-500"><span>{t('cb.packing')}</span><span className="tabular-nums">{money(fee)}</span></div>}
                    <div className="flex justify-between font-extrabold text-gray-900 text-base pt-1 border-t border-gray-100">
                      <span>{t('cb.total')}</span>
                      <span className="text-teal-600 tabular-nums">{money(total)}{monthly && <span className="text-[11px] font-semibold text-gray-500"> {t('cb.perMonth')}</span>}</span>
                    </div>
                  </div>
                )}

                {error && <FieldError message={error} className="mb-3" />}
                <button type="button" onClick={submit} disabled={!!need || busy}
                  className={`w-full py-3.5 rounded-2xl font-bold text-[13.5px] transition-all flex items-center justify-center gap-2 ${need ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 text-white hover:scale-[1.02]'}`}>
                  {busy && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {need ? fill(t('cb.addMore'), { n: need }) : editId ? t('cb.save') : fill(t('cb.order'), { total: money(total) })}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Phones: how full the box is, always in view; tap to see it */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="w-full max-w-3xl mx-auto flex items-center gap-3 text-left">
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-teal-50 flex items-center justify-center text-xl" aria-hidden="true">{monthly ? '🔄' : '📦'}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[12px] font-semibold text-gray-500">{fill(t('cb.minOf'), { n: count, min: config.minItems })}{!need && <span className="text-teal-700"> · {t('cb.readyShort')}</span>}</span>
            <span className="block h-1.5 mt-1 bg-gray-100 rounded-full overflow-hidden"><span className="block h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (count / config.minItems) * 100)}%` }} /></span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-[16px] font-extrabold text-gray-900 tabular-nums">{money(total)}</span>
            <span className="block text-[11.5px] font-bold text-teal-700">{t('cb.toSummary')} ↓</span>
          </span>
        </button>
      </div>
    </main>
  );
}
