'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { Icon } from '@/components/ui/icons';
import IconButton from '@/components/ui/IconButton';
import Menu from '@/components/ui/Menu';
import { Heading } from '@/components/ui/Heading';
import PawTrail from '@/components/PawTrail';
import NotificationItem from '@/components/NotificationItem';
import { markRead, setUnread, useUnread, type Notice } from '@/lib/notifications';

/** Which kinds of notification each filter shows. */
const KINDS: Record<string, string[]> = {
  orders: ['ORDER_PAID', 'PAYMENT_FAILED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'REFUNDED'],
  boxes: ['BOX_SHIPPED', 'BOX_DELIVERED', 'RENEWAL_DUE'],
  gifts: ['GIFT_SENT', 'REFERRAL_REWARD', 'WELCOME'],
};

/**
 * The notification centre: a small header with the unread count, an
 * All / Unread switch and a kind filter (icons only), then cards grouped
 * Today · Yesterday · This week · Earlier.
 */
export default function NotificationsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const unread = useUnread(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [kind, setKind] = useState('all');
  const [items, setItems] = useState<Notice[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function load(before?: string) {
    try {
      const q = new URLSearchParams({ ...(before ? { before } : {}), ...(filter === 'unread' ? { unread: '1' } : {}) });
      const res = await authFetch(`/me/notifications?${q}`);
      const d = res.ok ? await res.json() : null;
      setItems((l) => (before ? [...(l ?? []), ...(d?.items ?? [])] : (d?.items ?? [])));
      setHasMore(!!d?.hasMore);
      if (typeof d?.unreadCount === 'number') setUnread(d.unreadCount);
    } catch (e) {
      if (e instanceof SessionExpiredError) return router.replace(loginUrl('/account/notifications'));
      setItems((l) => l ?? []);
    }
  }

  useEffect(() => { setItems(null); load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (id: string) => (next: Notice | null) =>
    setItems((l) => (l ?? []).flatMap((x) => (x.id !== id ? [x] : next && !(filter === 'unread' && next.readAt) ? [next] : [])));

  const shown = (items ?? []).filter((n) => kind === 'all' || KINDS[kind]?.includes(n.type));
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
      <Heading kind="section" as="h1" title={t('ntf.title')} subtitle={unread > 0 ? fill(t('ntf.newN'), { n: unread }) : t('ntf.sub')}
        actions={unread > 0 && (
          <IconButton icon="check" label={t('ntf.readAll')} tone="primary"
            onClick={() => {
              setItems((l) => (filter === 'unread' ? [] : (l ?? []).map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))));
              markRead().catch(() => {});
            }} />
        )} />

      <div className="flex items-center gap-2 mb-4">
        <div role="tablist" className="inline-flex gap-1 p-1 rounded-full bg-gray-100">
          {(['all', 'unread'] as const).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
              className={`h-8 px-3.5 rounded-full text-[12.5px] font-bold inline-flex items-center gap-1.5 transition-colors ${filter === f ? 'bg-white text-teal-700' : 'text-gray-500 hover:text-gray-800'}`}>
              <Icon name={f === 'all' ? 'bell' : 'sparkle'} className="w-3.5 h-3.5" />
              {t(f === 'all' ? 'ntf.all' : 'ntf.unread')}
              {f === 'unread' && unread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-white text-[10px] leading-[18px] text-center tabular-nums">{unread}</span>}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Menu icon="filter" label={t('ntf.show')} title={t('ntf.show')} tone="mint" active={kind !== 'all'}
            onReset={() => setKind('all')} resetDisabled={kind === 'all'} resetLabel={t('ntf.all')}
            items={[['all', 'bell', 'ntf.all'], ['orders', 'bag', 'ntf.c.orders'], ['boxes', 'box', 'ntf.c.boxes'], ['gifts', 'gift', 'ntf.c.gifts']]
              .map(([k, icon, label]) => ({ icon, label: t(label), checked: kind === k, onClick: () => setKind(k) }))} />
        </div>
      </div>

      {items === null ? (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[76px] rounded-2xl bg-white ring-1 ring-gray-200/60 animate-pulse" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="relative overflow-hidden rounded-[28px] bg-teal-50/60 py-14 text-center">
          <PawTrail />
          <span className="relative inline-block text-5xl animate-[bob_2s_ease-in-out_infinite]" aria-hidden="true">
            <span className="inline-block animate-[wiggle_2.4s_ease-in-out_infinite]">{filter === 'unread' ? '🐶' : '🔔'}</span>
          </span>
          <p className="relative mt-3 text-[15px] font-bold text-gray-800">{t(filter === 'unread' ? 'ntf.allRead' : 'ntf.empty')}</p>
          {filter === 'all' && <p className="relative text-[12.5px] text-gray-500 mt-1 max-w-xs mx-auto">{t('ntf.emptySub')}</p>}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g, gi) => (
            <section key={g.key}>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">{t(g.key)}</p>
              <ul className="space-y-2">
                {g.list.map((n, i) => (
                  <NotificationItem key={n.id} n={n} onChange={update(n.id)} className="animate-[fadeUp_0.35s_ease-out_both]" style={{ animationDelay: `${Math.min(gi * 3 + i, 10) * 40}ms` }} />
                ))}
              </ul>
            </section>
          ))}
          {hasMore && (
            <div className="flex justify-center">
              <IconButton icon="plus" label={loadingMore ? t('ui.wait') : t('ntf.more')} disabled={loadingMore}
                onClick={async () => { setLoadingMore(true); await load(items[items.length - 1].id); setLoadingMore(false); }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
