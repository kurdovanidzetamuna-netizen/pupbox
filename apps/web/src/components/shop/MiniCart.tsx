'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { Icon } from '@/components/ui/icons';
import QuantityStepper from '@/components/shop/QuantityStepper';
import ProductThumb from '@/components/shop/ProductThumb';

const money = (n: unknown) => `₾${Number(n).toFixed(2)}`;

/**
 * The header's basket: the icon with its count opens a small panel (a sheet
 * on phones) listing what's in it — change amounts, remove — with the total
 * and a button to the basket page.
 */
export default function MiniCart() {
  const { t, lang } = useLanguage();
  const { cart, updateItem, removeItem } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = cart?.itemCount ?? 0;
  const items: any[] = cart?.items ?? [];

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { const n = e.target as Node; if (!box.current?.contains(n) && !sheet.current?.contains(n)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    try { await fn(); } catch {} finally { setBusy(null); }
  }

  const nameOf = (i: any) => {
    const src = i.product ?? i.subscriptionPlan;
    return (lang === 'ka' && src?.translations?.ka?.name?.trim()) || src?.name || '';
  };
  const label = `${t('nav.cart')}${count ? ` (${count})` : ''}`;

  const body = (<>
          <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2 shrink-0">
            <p className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
              {t('nav.cart')}
              {count > 0 && <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 rounded-full px-2 py-0.5">{count}</span>}
            </p>
            <button type="button" onClick={() => setOpen(false)} aria-label="×" className="w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center">
              <Icon name="close" className="w-4 h-4" />
            </button>
          </div>

          {items.length === 0 ? (
            <div className="px-6 pt-4 pb-7 text-center">
              <span className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center"><Icon name="bag" className="w-6 h-6" /></span>
              <p className="text-[13px] font-semibold text-gray-800">{t('mini.empty')}</p>
              <Link href="/shop" onClick={() => setOpen(false)} aria-label={t('mini.toShop')} title={t('mini.toShop')}
                className="mt-4 mx-auto w-11 h-11 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center hover:bg-teal-100">
                <Icon name="search" className="w-5 h-5" strokeWidth={2.2} />
              </Link>
            </div>
          ) : (<>
            <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 divide-y divide-gray-100">
              {items.map((i) => {
                const plain = !!i.product;
                const left = i.product?.inventory ? Math.max(0, i.product.inventory.quantity - (i.product.inventory.reservedQty || 0)) : Infinity;
                const extra = [i.personalisation?.size, i.personalisation?.engraving && `„${i.personalisation.engraving}“`].filter(Boolean).join(' · ');
                return (
                  <li key={i.id} className={`flex items-center gap-3 px-2 py-3 ${busy === i.id ? 'opacity-60' : ''}`}>
                    <ProductThumb item={i} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-1">{nameOf(i)}</p>
                      {extra && <p className="text-[11.5px] text-gray-500 truncate">{extra}</p>}
                      <p className="text-[12.5px] font-bold text-gray-800 mt-0.5 tabular-nums">{money(Number(i.price) * i.quantity)}</p>
                    </div>
                    {plain ? (
                      <QuantityStepper value={i.quantity} max={left} busy={busy === i.id} trashAtOne
                        onLess={() => run(i.id, () => (i.quantity <= 1 ? removeItem(i.id) : updateItem(i.id, i.quantity - 1)))}
                        onMore={() => run(i.id, () => updateItem(i.id, i.quantity + 1))} />
                    ) : (
                      <span className="flex items-center gap-1.5">
                        {i.quantity > 1 && <span className="text-[12px] font-bold text-gray-500">×{i.quantity}</span>}
                        <button type="button" onClick={() => run(i.id, () => removeItem(i.id))} aria-label={t('shop.uncheck')} title={t('shop.uncheck')}
                          className="w-9 h-9 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center">
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="shrink-0 border-t border-gray-100 px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:pb-4">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-[12.5px] text-gray-500">{t('co.sum.subtotal')}</span>
                <span className="text-[17px] font-extrabold text-gray-900 tabular-nums">{money(cart?.subtotal ?? 0)}</span>
              </div>
              <Link href="/cart" onClick={() => setOpen(false)} aria-label={fill(t('mini.go'), { total: money(cart?.total ?? 0) })}
                className="group w-full h-11 rounded-full bg-teal-600 text-white text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors">
                <Icon name="bag" className="w-[18px] h-[18px]" strokeWidth={2.2} />
                {t('mini.goShort')}
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </div>
          </>)}
  </>);

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={label} title={t('nav.cart')} aria-expanded={open} aria-haspopup="dialog"
        className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full transition ${open ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
        <Icon name="bag" className="w-5 h-5" strokeWidth={2} />
        {count > 0 && (
          <span key={count} className="absolute -top-0.5 -right-0.5 bg-teal-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ring-2 ring-white animate-[pop_0.3s_ease-out]">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label={t('nav.cart')}
          className="hidden sm:flex absolute z-50 right-0 top-full mt-2 w-[380px] max-h-[min(560px,75vh)] flex-col rounded-3xl bg-white ring-1 ring-gray-200/80 shadow-[0_12px_40px_-12px_rgba(36,48,58,0.25)] animate-[fadeUp_0.15s_ease-out]">
          {body}
        </div>
      )}
      {/* Phones: a sheet from the bottom, drawn at the page level (the header's
          blur would otherwise pin it to the header instead of the screen). */}
      {open && mounted && createPortal(
        <div className="sm:hidden fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-gray-900/25 animate-[fadeIn_0.15s_ease-out]" aria-hidden="true" onClick={() => setOpen(false)} />
          <div ref={sheet} role="dialog" aria-label={t('nav.cart')}
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] flex flex-col rounded-t-3xl bg-white animate-[fadeUp_0.2s_ease-out]">
            <span className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-200 shrink-0" aria-hidden="true" />
            {body}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
