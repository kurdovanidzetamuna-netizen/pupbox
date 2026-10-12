'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { Icon } from '@/components/ui/icons';
import PawTrail from '@/components/PawTrail';
import NotificationItem from '@/components/NotificationItem';
import { markRead, setUnread, useUnread, type Notice } from '@/lib/notifications';

/** The filter chips, and which kinds of notification each one asks the API for. */
const FILTERS: { key: string; icon: string; label: string; types?: string[] }[] = [
  { key: 'all', icon: 'bell', label: 'ntf.all' },
  { key: 'unread', icon: 'sparkle', label: 'ntf.unread' },
  { key: 'orders', icon: 'bag', label: 'ntf.c.orders', types: ['ORDER_PAID', 'PAYMENT_FAILED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'REFUNDED'] },
  { key: 'boxes', icon: 'box', label: 'ntf.c.boxes', types: ['BOX_SHIPPED', 'BOX_DELIVERED', 'RENEWAL_DUE'] },
  { key: 'gifts', icon: 'gift', label: 'ntf.c.gifts', types: ['GIFT_SENT', 'REFERRAL_REWARD', 'WELCOME'] },
];

/**
 * The notification centre: a friendly header with the unread count and
 * "Mark all as read", one row of filter chips, then cards grouped
 * Today · Yesterday · This week · Earlier. Loading, empty and error each have
 * their own state, so a failed request never looks like "no notifications".
 */
export default function NotificationsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const unread = useUnread(false);
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState<Notice[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const types = FILTERS.find((f) => f.key === filter)?.types;

  async function load(before?: string) {
    try {
      const q = new URLSearchParams({
        ...(before ? { before } : {}),
        ...(filter === 'unread' ? { unread: '1' } : {}),
        ...(types ? { types: types.join(',') } : {}),
      });
      const res = await authFetch(`/me/notifications?${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setItems((l) => (before ? [...(l ?? []), ...d.items] : d.items));
      setHasMore(!!d.hasMore);
      setUnread(d.unreadCount);
      setFailed(false);
    } catch (e) {
      if (e instanceof SessionExpiredError) return router.replace(loginUrl('/account/notifications'));
      if (!before) setItems(null);
      setFailed(true);
    }
  }

  useEffect(() => { setItems(null); setFailed(false); load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (id: string) => (next: Notice | null) =>
    setItems((l) => (l ?? []).flatMap((x) => (x.id !== id ? [x] : next && !(filter === 'unread' && next.readAt) ? [next] : [])));

  function readAll() {
    setItems((l) => (filter === 'unread' ? [] : (l ?? []).map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))));
    markRead().catch(() => {});
  }

  const shown = items ?? [];
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = day(new Date());
  const age = (n: Notice) => Math.round((today - day(new Date(n.createdAt))) / 86_400_000);
  const groups = [
    { key: 'ntf.today', list: shown.filter((n) => age(n) <= 0) },
    { key: 'ntf.yesterday', list: shown.filter((n) => age(n) === 1) },
    { key: 'ntf.week', list: shown.filter((n) => age(n) > 1 && age(n) < 7) },
    { key: 'ntf.earlier', list: shown.filter((n) => age(n) >= 7) },
  ].filter((g) => g.list.length);

  return (
    <div>
      {/* Header: what this is, how much is new, and the one action that matters. */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-50 via-white to-lilac-50 ring-1 ring-teal-100/70 px-4 sm:px-6 py-4 sm:py-5 mb-4">
        <span aria-hidden="true" className="absolute -right-10 -top-12 w-44 h-44 rounded-full bg-teal-100/50 blur-2xl" />
        <span aria-hidden="true" className="absolute right-24 -bottom-16 w-36 h-36 rounded-full bg-lilac-100/60 blur-2xl" />
        <div className="relative flex items-center gap-4 sm:gap-5">
          <span className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white shadow-soft ring-1 ring-teal-100 text-teal-600 flex items-center justify-center">
            <Icon name="bell" className={`w-6 h-6 sm:w-7 sm:h-7 origin-top ${unread ? 'animate-[wag_1.2s_ease-in-out_2]' : ''}`} />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[24px] h-6 px-1.5 rounded-full bg-peach-600 text-white text-[12px] font-bold leading-6 text-center ring-[3px] ring-white tabular-nums animate-[pop_0.35s_ease-out]">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] sm:text-[24px] font-extrabold tracking-tight text-gray-900 leading-tight">{t('ntf.title')}</h1>
            <p className="text-[13.5px] sm:text-[14px] text-gray-600 mt-1 text-balance">
              {unread > 0 ? fill(t(unread === 1 ? 'ntf.heroOne' : 'ntf.heroN'), { n: unread }) : t('ntf.heroNone')}
            </p>
          </div>
          {unread > 0 && (
            <button type="button" onClick={readAll}
              className="hidden sm:inline-flex shrink-0 items-center gap-2 h-11 px-4 rounded-full bg-teal-600 text-white text-[13.5px] font-semibold shadow-glow hover:bg-teal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
              <Icon name="check" className="w-4 h-4" strokeWidth={2.2} />
              {t('ntf.readAll')}
            </button>
          )}
        </div>
        {unread > 0 && (
          <button type="button" onClick={readAll}
            className="sm:hidden relative mt-3 w-full inline-flex items-center justify-center gap-2 h-10 rounded-full bg-teal-600 text-white text-[13.5px] font-semibold shadow-glow active:bg-teal-700">
            <Icon name="check" className="w-4 h-4" strokeWidth={2.2} />
            {t('ntf.readAll')}
          </button>
        )}
      </header>

      {/* One row of filters; scrolls sideways on phones. */}
      <div role="tablist" aria-label={t('ntf.show')}
        className="flex sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 mb-4">
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <button key={f.key} type="button" role="tab" aria-selected={on} onClick={() => setFilter(f.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
                on ? 'bg-teal-600 text-white shadow-glow' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-teal-200 hover:text-teal-700'}`}>
              <Icon name={f.icon} className="w-4 h-4" />
              {t(f.label)}
              {f.key === 'unread' && unread > 0 && (
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-5 text-center tabular-nums ${on ? 'bg-white text-teal-700' : 'bg-teal-600 text-white'}`}>{unread}</span>
              )}
            </button>
          );
        })}
      </div>

      {failed && items === null ? (
        <div role="alert" className="rounded-3xl bg-white ring-1 ring-peach-200 px-6 py-12 text-center">
          <span className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-peach-50 text-peach-600 flex items-center justify-center"><Icon name="alert" className="w-7 h-7" /></span>
          <p className="text-[16px] font-bold text-gray-900">{t('ntf.errTitle')}</p>
          <p className="text-[13.5px] text-gray-500 mt-1.5 max-w-sm mx-auto">{t('ntf.errSub')}</p>
          <button type="button" onClick={() => { setFailed(false); load(); }}
            className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-teal-600 text-white text-[13.5px] font-semibold hover:bg-teal-700 transition-colors">
            <Icon name="refresh" className="w-4 h-4" />
            {t('ntf.retry')}
          </button>
        </div>
      ) : items === null ? (
        <div className="space-y-2" aria-busy="true" aria-label={t('ui.wait')}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 p-3 sm:p-3.5 rounded-2xl bg-white ring-1 ring-gray-200/60">
              <span className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse shrink-0" />
              <span className="flex-1 space-y-2.5 pt-1">
                <span className="block h-3.5 w-2/5 rounded-full bg-gray-100 animate-pulse" />
                <span className="block h-3 w-4/5 rounded-full bg-gray-100 animate-pulse" />
                <span className="block h-2.5 w-16 rounded-full bg-gray-100 animate-pulse" />
              </span>
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200/60 px-6 py-14 sm:py-16 text-center">
          <PawTrail />
          <span className="relative mx-auto w-20 h-20 rounded-[28px] bg-gradient-to-br from-teal-100 to-lilac-100 flex items-center justify-center text-4xl animate-[bob_2.4s_ease-in-out_infinite]" aria-hidden="true">
            {filter === 'unread' ? '🐶' : '🔔'}
          </span>
          <p className="relative mt-5 text-[17px] font-bold text-gray-900">
            {t(filter === 'unread' ? 'ntf.allRead' : filter === 'all' ? 'ntf.empty' : 'ntf.emptyKind')}
          </p>
          <p className="relative text-[13.5px] text-gray-500 mt-1.5 max-w-xs mx-auto text-balance">
            {t(filter === 'unread' ? 'ntf.allReadSub' : 'ntf.emptySub')}
          </p>
          {filter === 'all' ? (
            <Link href="/prices"
              className="relative mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-teal-600 text-white text-[13.5px] font-semibold shadow-glow hover:bg-teal-700 transition-colors">
              {t('ntf.cta')}
              <Icon name="arrow" className="w-4 h-4" />
            </Link>
          ) : (
            <button type="button" onClick={() => setFilter('all')}
              className="relative mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white text-gray-800 ring-1 ring-gray-200 text-[13.5px] font-semibold hover:ring-teal-200 transition">
              {t('ntf.seeAll')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g, gi) => (
            <section key={g.key} aria-labelledby={`ntf-${g.key}`}>
              <h2 id={`ntf-${g.key}`} className="flex items-center gap-3 text-[12px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">
                {t(g.key)}
                <span className="flex-1 h-px bg-gray-200/80" aria-hidden="true" />
              </h2>
              <ul className="space-y-2">
                {g.list.map((n, i) => (
                  <NotificationItem key={n.id} n={n} onChange={update(n.id)} className="animate-[fadeUp_0.3s_ease-out_both]" style={{ animationDelay: `${Math.min(gi * 3 + i, 10) * 40}ms` }} />
                ))}
              </ul>
            </section>
          ))}
          {hasMore && (
            <div className="flex justify-center pt-1">
              <button type="button" disabled={loadingMore}
                onClick={async () => { setLoadingMore(true); await load(shown[shown.length - 1].id); setLoadingMore(false); }}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white ring-1 ring-gray-200 text-[13.5px] font-semibold text-gray-700 hover:ring-teal-200 hover:text-gray-900 transition disabled:opacity-50">
                <Icon name={loadingMore ? 'refresh' : 'plus'} className={`w-4 h-4 ${loadingMore ? 'animate-spin' : ''}`} />
                {loadingMore ? t('ui.wait') : t('ntf.more')}
              </button>
            </div>
          )}
          {failed && <p role="alert" className="text-center text-[13px] text-peach-600">{t('ntf.errSub')}</p>}
        </div>
      )}
    </div>
  );
}
