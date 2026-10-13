'use client';
import Link from '@/components/LangLink';
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
export default function PaymentCards({ onExpired, addTick = 0, onCount }: {
  onExpired: () => void;
  /** Bumped by the tab's ＋ button to show how to add a card. */
  addTick?: number;
  onCount?: (n: number) => void;
}) {
  const { t } = useLanguage();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [how, setHow] = useState(false);
  const [toRemove, setToRemove] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);

  const call = (path: string, init?: RequestInit) => authFetch(path, init).then((r) => r.json())
    .then((d) => { if (Array.isArray(d)) setCards([...d].sort((a, b) => rank(a) - rank(b))); })
    .catch((e) => { if (e instanceof SessionExpiredError) onExpired(); else setCards((c) => c ?? []); });

  useEffect(() => { call('/me/cards'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (addTick) setHow(true); }, [addTick]);
  useEffect(() => { if (cards) onCount?.(cards.length); }, [cards?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const label = (c: Card) => `${NAMES[c.brand] ?? c.brand} •••• ${c.last4}`;
  const mmyy = (c: Card) => `${String(c.expMonth).padStart(2, '0')}/${String(c.expYear).slice(-2)}`;

  return (
    <>
      {cards === null ? (
        <div className="h-12 rounded-xl bg-gray-100 animate-pulse" aria-hidden="true" />
      ) : (
        <ul className="divide-y divide-gray-100">
          {cards.map((c) => {
            const state = expiry(c);
            return (
              <li key={c.id} className={`flex items-center gap-3 py-2.5 first:pt-0 ${state === 'expired' ? 'opacity-60' : ''}`}>
                {/* A tiny card in the network's colour. */}
                <span className={`relative w-12 h-8 shrink-0 rounded-lg bg-gradient-to-br ring-1 ring-black/5 flex items-end justify-end p-1 overflow-hidden ${THEME[c.brand] ?? THEME.CARD} ${state === 'expired' ? 'grayscale' : ''}`}>
                  <span className="absolute left-1.5 top-1.5 w-3 h-2 rounded-[2px] bg-amber-300/90" aria-hidden="true" />
                  <span className="scale-[0.55] origin-bottom-right"><BrandMark brand={c.brand} /></span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 truncate flex items-center gap-1.5">
                    {NAMES[c.brand] ?? c.brand} <span className="tabular-nums tracking-wider text-gray-700">•••• {c.last4}</span>
                    {c.isDefault && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-teal-700 bg-teal-50 rounded-full px-1.5 py-0.5"><Icon name="star" className="w-2.5 h-2.5" strokeWidth={2.8} />{t('cards.default')}</span>}
                  </p>
                  <p className="text-[12px] text-gray-500 flex items-center gap-1.5">
                    {t('cards.expires')} <span className="tabular-nums">{mmyy(c)}</span>
                    {state && (
                      <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${state === 'expired' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                        {t(state === 'expired' ? 'cards.expired' : 'cards.expiring')}
                      </span>
                    )}
                  </p>
                </div>
                <Menu label={t('cards.actions')} items={[
                  ...(!c.isDefault && state !== 'expired' ? [{ icon: 'star', label: t('cards.makeDefault'), onClick: () => call(`/me/cards/${c.id}/default`, { method: 'PATCH' }) }] : []),
                  { icon: 'trash', label: t('cards.remove'), tone: 'danger' as const, onClick: () => setToRemove(c) },
                ]} />
              </li>
            );
          })}
        </ul>
      )}
      {cards?.length === 0 && (
        <button type="button" onClick={() => setHow(true)}
          className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 px-4 py-3 text-gray-400 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/40 transition-colors">
          <Icon name="card" className="w-5 h-5" /><span className="text-[12.5px] font-medium">{t('cards.empty')} · {t('cards.add')}</span>
        </button>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-400"><Icon name="lock" className="w-3.5 h-3.5" />{t('cards.secure')}</p>

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
    </>
  );
}
