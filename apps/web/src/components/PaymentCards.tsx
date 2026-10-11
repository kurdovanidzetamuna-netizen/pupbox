'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch, SessionExpiredError } from '@/lib/authFetch';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Menu from '@/components/ui/Menu';
import { Icon } from '@/components/ui/icons';

type Card = { id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean };

/** Soft colours per card network, so each card is recognisable at a glance. */
const THEME: Record<string, string> = {
  VISA:       'from-sky-100 via-teal-50 to-teal-100 text-teal-900',
  MASTERCARD: 'from-peach-100 via-amber-50 to-peach-50 text-amber-900',
  MAESTRO:    'from-lilac-100 via-sky-50 to-lilac-50 text-indigo-900',
  AMEX:       'from-teal-50 via-sky-50 to-sky-100 text-sky-900',
  CARD:       'from-gray-100 via-white to-gray-100 text-gray-800',
};
const NAMES: Record<string, string> = { VISA: 'Visa', MASTERCARD: 'Mastercard', MAESTRO: 'Maestro', AMEX: 'Amex', CARD: 'Card' };

function BrandMark({ brand }: { brand: string }) {
  if (brand === 'VISA') return <span className="text-[17px] font-black italic tracking-tight text-[#1A1F71]">VISA</span>;
  if (brand === 'MASTERCARD' || brand === 'MAESTRO') return (
    <svg viewBox="0 0 40 24" className="h-6 w-10" aria-label={NAMES[brand]}>
      <circle cx="15" cy="12" r="9" fill="#EB001B" opacity="0.85" />
      <circle cx="25" cy="12" r="9" fill={brand === 'MAESTRO' ? '#00A2E5' : '#F79E1B'} opacity="0.85" />
    </svg>
  );
  return <Icon name="card" className="w-6 h-6 opacity-60" />;
}

/** "expired" | "soon" (within two months) | null */
function expiry(c: Card) {
  const now = new Date();
  const months = (c.expYear - now.getFullYear()) * 12 + (c.expMonth - (now.getMonth() + 1));
  return months < 0 ? 'expired' : months <= 1 ? 'soon' : null;
}

/** Main card first, expired ones last. */
const rank = (c: Card) => (c.isDefault ? 0 : expiry(c) === 'expired' ? 2 : 1);

/** The saved-card wallet: card tiles with a ⋯ menu, swipeable on phones. */
export default function PaymentCards({ onExpired }: { onExpired: () => void }) {
  const { t } = useLanguage();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [how, setHow] = useState(false);
  const [toRemove, setToRemove] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);

  const call = (path: string, init?: RequestInit) => authFetch(path, init).then((r) => r.json())
    .then((d) => { if (Array.isArray(d)) setCards([...d].sort((a, b) => rank(a) - rank(b))); })
    .catch((e) => { if (e instanceof SessionExpiredError) onExpired(); else setCards((c) => c ?? []); });

  useEffect(() => { call('/me/cards'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const label = (c: Card) => `${NAMES[c.brand] ?? c.brand} •••• ${c.last4}`;
  const mmyy = (c: Card) => `${String(c.expMonth).padStart(2, '0')}/${String(c.expYear).slice(-2)}`;

  return (
    <section className="bg-white rounded-3xl ring-1 ring-gray-200/60 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
          {t('cards.title')}
          {!!cards?.length && <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{cards.length}</span>}
        </h2>
        <span title={t('cards.secure')} className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 rounded-full px-2.5 py-1">
          <Icon name="lock" className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t('cards.secure')}</span>
        </span>
      </div>

      {/* Phones: a row you swipe through; wider screens: a grid. */}
      <ul className="flex sm:grid sm:grid-cols-2 xl:grid-cols-3 gap-3 overflow-x-auto sm:overflow-visible snap-x snap-mandatory -mx-5 px-5 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none]">
        {cards === null && <li className="shrink-0 w-[78%] sm:w-auto aspect-[1.586/1] rounded-2xl bg-gray-100 animate-pulse" aria-hidden="true" />}

        {cards?.map((c) => {
          const state = expiry(c);
          return (
            <li key={c.id} className="snap-start shrink-0 w-[78%] sm:w-auto">
              <div className={`relative aspect-[1.586/1] rounded-2xl bg-gradient-to-br p-4 flex flex-col justify-between ring-1 transition-transform hover:-translate-y-0.5
                ${THEME[c.brand] ?? THEME.CARD} ${c.isDefault ? 'ring-teal-300' : 'ring-black/5'} ${state === 'expired' ? 'grayscale opacity-70' : ''}`}>
                {/* Clipped on its own layer, so the ⋯ menu can open past the card's edge. */}
                <span className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none" aria-hidden="true">
                  <span className="absolute -right-10 -top-12 w-40 h-40 rounded-full bg-white/40" />
                  <span className="absolute -left-6 -bottom-16 w-36 h-36 rounded-full bg-white/30" />
                </span>

                <div className="relative flex items-start justify-between">
                  <span className="w-9 h-7 rounded-md bg-gradient-to-br from-amber-200 to-amber-300/80 ring-1 ring-amber-400/30" aria-hidden="true">
                    <span className="block mt-[9px] mx-1.5 h-px bg-amber-500/40" /><span className="block mt-[6px] mx-1.5 h-px bg-amber-500/40" />
                  </span>
                  <div className="flex items-center gap-1 -mr-2 -mt-2">
                    {c.isDefault && (
                      <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-white/80 text-teal-700 text-[10.5px] font-bold">
                        <Icon name="star" className="w-3 h-3" strokeWidth={2.6} />{t('cards.default')}
                      </span>
                    )}
                    <Menu label={t('cards.actions')} items={[
                      ...(!c.isDefault && state !== 'expired' ? [{ icon: 'star', label: t('cards.makeDefault'), onClick: () => call(`/me/cards/${c.id}/default`, { method: 'PATCH' }) }] : []),
                      { icon: 'trash', label: t('cards.remove'), tone: 'danger' as const, onClick: () => setToRemove(c) },
                    ]} />
                  </div>
                </div>

                <p className="relative text-[17px] sm:text-[18px] font-semibold tracking-[0.18em] tabular-nums" aria-label={label(c)}>
                  <span className="opacity-40">••••</span> {c.last4}
                </p>

                <div className="relative flex items-end justify-between">
                  <div>
                    <p className="text-[9.5px] uppercase tracking-wider opacity-50">{t('cards.expires')}</p>
                    <p className="text-[13px] font-semibold tabular-nums flex items-center gap-1.5">
                      {mmyy(c)}
                      {state && (
                        <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 tracking-normal ${state === 'expired' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                          {t(state === 'expired' ? 'cards.expired' : 'cards.expiring')}
                        </span>
                      )}
                    </p>
                  </div>
                  <BrandMark brand={c.brand} />
                </div>
              </div>
            </li>
          );
        })}

        {cards?.length === 0 && (
          <li className="snap-start shrink-0 w-[78%] sm:w-auto">
            {/* Where a card will sit: no made-up numbers. */}
            <div className="relative aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-lilac-50 via-white to-teal-50 ring-1 ring-gray-200/70 p-4 flex flex-col justify-between overflow-hidden">
              <span className="absolute -right-10 -top-12 w-40 h-40 rounded-full bg-teal-100/30" aria-hidden="true" />
              <span className="w-9 h-7 rounded-md bg-gray-200/70" aria-hidden="true" />
              <p className="relative text-[17px] font-semibold tracking-[0.18em] text-gray-300" aria-hidden="true">•••• ••••</p>
              <p className="relative text-[12px] font-medium text-gray-500">{t('cards.empty')}</p>
            </div>
          </li>
        )}

        {cards !== null && (
          <li className="snap-start shrink-0 w-[40%] sm:w-auto">
            <button type="button" onClick={() => setHow(true)} aria-label={t('cards.add')}
              className="w-full aspect-[1.586/1] sm:aspect-auto sm:h-full sm:min-h-[120px] rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/40 transition-colors flex flex-col items-center justify-center gap-1.5">
              <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"><Icon name="plus" className="w-5 h-5" strokeWidth={2.2} /></span>
              <span className="text-[12px] font-medium">{t('cards.add')}</span>
            </button>
          </li>
        )}
      </ul>

      <Modal open={how} onClose={() => setHow(false)} title={t('cards.howTitle')}>
        <div className="space-y-4">
          <p className="text-[13px] text-gray-600 flex gap-2.5">
            <span className="w-8 h-8 shrink-0 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center"><Icon name="shield" className="w-[18px] h-[18px]" /></span>
            {t('cards.howBody')}
          </p>
          <ol className="space-y-2">
            {['cards.how1', 'cards.how2', 'cards.how3'].map((k, i) => (
              <li key={k} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 text-[13px] text-gray-700">
                <span className="w-6 h-6 shrink-0 rounded-full bg-white ring-1 ring-gray-200 text-[11px] font-bold text-teal-700 flex items-center justify-center">{i + 1}</span>
                {t(k)}
              </li>
            ))}
          </ol>
          <div className="flex justify-end">
            <Link href="/prices#plans" className="inline-flex items-center gap-1.5 bg-teal-600 text-white text-[13px] font-semibold px-5 py-2.5 hover:bg-teal-700">{t('cards.howCta')}</Link>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!toRemove} onClose={() => setToRemove(null)} busy={busy} tone="danger"
        title={t('cards.removeTitle')} message={toRemove ? fill(t('cards.removeMsg'), { card: label(toRemove) }) : ''} confirmLabel={t('cards.remove')}
        onConfirm={async () => { if (!toRemove) return; setBusy(true); await call(`/me/cards/${toRemove.id}`, { method: 'DELETE' }); setBusy(false); setToRemove(null); }} />
    </section>
  );
}
