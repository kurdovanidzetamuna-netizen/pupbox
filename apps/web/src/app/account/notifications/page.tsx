'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { Icon } from '@/components/ui/icons';
import IconButton from '@/components/ui/IconButton';
import NotificationItem from '@/components/NotificationItem';
import { markRead, setUnread, useUnread, type Notice } from '@/lib/notifications';
import { TYPE } from '@/components/ui/Heading';

/** Every notification, newest first: All / Unread, grouped Today and Earlier. */
export default function NotificationsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const unread = useUnread(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [items, setItems] = useState<Notice[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function load(before?: string) {
    try {
      const q = new URLSearchParams({ ...(before ? { before } : {}), ...(filter === 'unread' ? { unread: '1' } : {}) });
      const d = await authFetch(`/me/notifications?${q}`).then((r) => r.json());
      if (!Array.isArray(d?.items)) return;
      setItems((l) => (before ? [...(l ?? []), ...d.items] : d.items));
      setHasMore(d.hasMore);
      setUnread(d.unreadCount);
    } catch (e) {
      if (e instanceof SessionExpiredError) router.replace(loginUrl('/account/notifications'));
    }
  }

  useEffect(() => { setItems(null); load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (id: string) => (next: Notice | null) =>
    setItems((l) => (l ?? []).flatMap((x) => (x.id !== id ? [x] : next && !(filter === 'unread' && next.readAt) ? [next] : [])));

  const today = new Date().toDateString();
  const groups = [
    { key: 'ntf.today', list: (items ?? []).filter((n) => new Date(n.createdAt).toDateString() === today) },
    { key: 'ntf.earlier', list: (items ?? []).filter((n) => new Date(n.createdAt).toDateString() !== today) },
  ].filter((g) => g.list.length);

  return (
    <section className="bg-white rounded-3xl ring-1 ring-gray-200/60 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className={TYPE.section}>{t('ntf.title')}</h1>
        <div className="flex items-center gap-1.5">
          <div role="tablist" className="grid grid-cols-2 p-1 rounded-full bg-gray-100 text-[12px] font-semibold">
            {(['all', 'unread'] as const).map((f) => (
              <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full transition-colors flex items-center justify-center gap-1.5 ${filter === f ? 'bg-white text-teal-700 ring-1 ring-teal-100' : 'text-gray-500 hover:text-gray-800'}`}>
                {t(f === 'all' ? 'ntf.all' : 'ntf.unread')}
                {f === 'unread' && unread > 0 && <span className="text-[10.5px] text-peach-600 tabular-nums">{unread}</span>}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <IconButton icon="check" label={t('ntf.readAll')} tone="primary"
              onClick={() => {
                setItems((l) => (filter === 'unread' ? [] : (l ?? []).map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))));
                markRead().catch(() => {});
              }} />
          )}
        </div>
      </div>

      {items === null ? (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[72px] rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-14">
          <span className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Icon name={filter === 'unread' ? 'check' : 'bell'} className="w-7 h-7" />
          </span>
          <p className="text-[14px] font-semibold text-gray-800">{t(filter === 'unread' ? 'ntf.emptyUnread' : 'ntf.empty')}</p>
          {filter === 'all' && <p className="text-[12.5px] text-gray-500 mt-1">{t('ntf.emptySub')}</p>}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1.5">{t(g.key)}</p>
              <ul className="space-y-1">
                {g.list.map((n) => <NotificationItem key={n.id} n={n} onChange={update(n.id)} />)}
              </ul>
            </div>
          ))}
          {hasMore && (
            <div className="text-center">
              <button type="button" disabled={loadingMore}
                onClick={async () => { setLoadingMore(true); await load(items[items.length - 1].id); setLoadingMore(false); }}
                className="px-5 py-2 rounded-full text-[12.5px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50">
                {loadingMore ? t('ui.wait') : t('ntf.more')}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
