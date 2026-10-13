'use client';
import Segmented from '@/components/ui/Segmented';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { Icon } from '@/components/ui/icons';
import IconButton from '@/components/ui/IconButton';
import AddressBook from '@/components/AddressBook';
import PaymentCards from '@/components/PaymentCards';

type Tab = 'addresses' | 'cards';
const KEY = 'pupbox_wallet';

/**
 * Addresses and saved cards in one block: a header that opens and closes it
 * (with a one-line summary while closed), two tabs inside, and ＋ for the
 * tab you're on. Remembers open/closed and the tab on this device.
 */
export default function AddressesAndCards({ onExpired }: { onExpired: () => void }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>('addresses');
  const [counts, setCounts] = useState({ addresses: 0, cards: 0 });
  const [addTick, setAddTick] = useState({ addresses: 0, cards: 0 });

  // Read once, then save only what the customer changes (never the defaults
  // over what was stored).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (typeof saved.open === 'boolean') setOpen(saved.open);
      if (saved.tab === 'cards' || saved.tab === 'addresses') setTab(saved.tab);
    } catch {}
  }, []);
  const remember = (next: { open?: boolean; tab?: Tab }) => {
    try { localStorage.setItem(KEY, JSON.stringify({ open, tab, ...next })); } catch {}
  };
  const toggle = () => { setOpen(!open); remember({ open: !open }); };
  const pick = (x: Tab) => { setTab(x); remember({ tab: x }); };

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'addresses', icon: 'pin', label: t('wallet.addresses') },
    { id: 'cards', icon: 'card', label: t('wallet.cards') },
  ];

  return (
    <section className="bg-white rounded-3xl ring-1 ring-gray-200/60">
      <div className="flex items-center gap-2 p-4 sm:px-5">
        <button type="button" onClick={toggle} aria-expanded={open} aria-controls="wallet-body"
          className="flex-1 min-w-0 flex items-center gap-3 text-left">
          <span className="w-9 h-9 shrink-0 rounded-xl bg-lilac-50 text-lilac-600 flex items-center justify-center"><Icon name="home" className="w-[18px] h-[18px]" /></span>
          <span className="min-w-0">
            <span className="block text-[14px] font-bold text-gray-900 truncate">{t('wallet.title')}</span>
            <span className="block text-[12px] text-gray-500 truncate">{fill(t('wallet.summary'), { a: counts.addresses, c: counts.cards })}</span>
          </span>
        </button>
        {open && <IconButton icon="plus" size="sm" tone="primary" label={t(tab === 'addresses' ? 'addr.add' : 'cards.add')}
          onClick={() => setAddTick((n) => ({ ...n, [tab]: n[tab] + 1 }))} />}
        <button type="button" onClick={toggle} aria-label={t('wallet.title')} aria-expanded={open}
          className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors">
          <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>

      {/* Kept mounted while closed, so the summary counts stay right. */}
      <div id="wallet-body" hidden={!open} className="px-4 sm:px-5 pb-4 sm:pb-5">
        <Segmented size="sm" className="mb-3" label={t('wallet.title')} value={tab} onChange={pick}
          options={tabs.map((x) => ({ value: x.id, label: x.label, icon: x.icon, count: counts[x.id] }))} />
        <div id="wallet-addresses" role="tabpanel" hidden={tab !== 'addresses'}>
          <AddressBook onExpired={onExpired} addTick={addTick.addresses} onCount={(n) => setCounts((c) => ({ ...c, addresses: n }))} />
        </div>
        <div id="wallet-cards" role="tabpanel" hidden={tab !== 'cards'}>
          <PaymentCards onExpired={onExpired} addTick={addTick.cards} onCount={(n) => setCounts((c) => ({ ...c, cards: n }))} />
        </div>
      </div>
    </section>
  );
}
