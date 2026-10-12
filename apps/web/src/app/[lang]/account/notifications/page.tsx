'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { Icon } from '@/components/ui/icons';
import IconButton from '@/components/ui/IconButton';
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
      {/* Title, how much is new, and "Mark all as read" as an icon. */}
      <div className="flex items-end justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-gray-900 flex items-center gap-2.5">
            {t('ntf.title')}
            {unread > 0 && <span className="min-w-[24px] h-6 px-2 rounded-full bg-teal-600 text-white text-[12px] font-bold leading-6 text-center tabular-nums animate-[pop_0.3s_ease-out]">{unread}</span>}
          </h1>
          <p className="text-[13.5px] text-gray-500 mt-1">{unread > 0 ? fill(t('ntf.newN'), { n: unread }) : t('ntf.allRead')}</p>
        </div>
        {unread > 0 && <IconButton icon="check" tone="primary" label={t('ntf.readAll')} onClick={readAll} />}
      </div>

      {/* Filters as icons (name on hover), in the site's grey pill switch. */}
      <div className="mb-4">
        <div role="tablist" aria-label={t('ntf.show')} className="inline-flex gap-1 p-1 rounded-full bg-gray-100">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button key={f.key} type="button" role="tab" aria-selected={on} aria-label={t(f.label)} onClick={() => setFilter(f.key)}
                className={`group/tab relative shrink-0 inline-flex items-center justify-center w-10 h-9 rounded-full transition-colors ${
                  on ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                <Icon name={f.icon} className="w-[18px] h-[18px]" />
                {f.key === 'unread' && unread > 0 && <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-teal-600 text-white text-[9.5px] font-bold leading-4 text-center tabular-nums">{unread}</span>}
                <span role="tooltip" className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover/tab:block group-focus-visible/tab:block whitespace-nowrap rounded-lg bg-gray-800 text-white text-[11px] font-medium px-2 py-1 z-30">{t(f.label)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* One white list, grouped by day. */}
      <div className="rounded-2xl bg-white ring-1 ring-gray-100 overflow-hidden">
        {failed && items === null ? (
          <div role="alert" className="px-6 py-12 text-center">
            <span className="mx-auto mb-3 w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><Icon name="alert" className="w-6 h-6" /></span>
            <p className="text-[15px] font-bold text-gray-900">{t('ntf.errTitle')}</p>
            <p className="text-[13px] text-gray-500 mt-1">{t('ntf.errSub')}</p>
            <div className="mt-4 flex justify-center"><IconButton icon="refresh" tone="primary" label={t('ntf.retry')} onClick={() => { setFailed(false); load(); }} /></div>
          </div>
        ) : items === null ? (
          <div className="divide-y divide-gray-100" aria-busy="true" aria-label={t('ui.wait')}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 px-4 py-4">
                <span className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <span className="flex-1 space-y-2 pt-1">
                  <span className="block h-3 w-2/5 rounded-full bg-gray-100 animate-pulse" />
                  <span className="block h-3 w-3/4 rounded-full bg-gray-100 animate-pulse" />
                </span>
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center animate-[bob_2.4s_ease-in-out_infinite]">
              <Icon name={filter === 'unread' ? 'check' : 'bell'} className="w-7 h-7" />
            </span>
            <p className="mt-4 text-[15px] font-bold text-gray-900">
              {t(filter === 'unread' ? 'ntf.allRead' : filter === 'all' ? 'ntf.empty' : 'ntf.emptyKind')}
            </p>
            <p className="text-[13px] text-gray-500 mt-1 max-w-xs mx-auto">{t(filter === 'unread' ? 'ntf.allReadSub' : 'ntf.emptySub')}</p>
          </div>
        ) : (
          <>
            {groups.map((g, gi) => (
              <section key={g.key} aria-labelledby={`ntf-${g.key}`}>
                <h2 id={`ntf-${g.key}`} className="px-4 py-2 bg-gray-50/80 border-y border-gray-100 first:border-t-0 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t(g.key)}</h2>
                <ul className="divide-y divide-gray-100">
                  {g.list.map((n, i) => (
                    <NotificationItem key={n.id} n={n} onChange={update(n.id)} className="animate-[fadeUp_0.25s_ease-out_both]" style={{ animationDelay: `${Math.min(gi * 3 + i, 10) * 35}ms` }} />
                  ))}
                </ul>
              </section>
            ))}
            {hasMore && (
              <div className="border-t border-gray-100 p-3 text-center">
                <IconButton icon={loadingMore ? 'refresh' : 'plus'} tone="primary" label={loadingMore ? t('ui.wait') : t('ntf.more')} disabled={loadingMore}
                  onClick={async () => { setLoadingMore(true); await load(shown[shown.length - 1].id); setLoadingMore(false); }} />
              </div>
            )}
            {failed && <p role="alert" className="border-t border-gray-100 px-4 py-3 text-center text-[13px] text-red-600">{t('ntf.errSub')}</p>}
          </>
        )}
      </div>
    </div>
  );
}
