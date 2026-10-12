'use client';
import Link from '@/components/LangLink';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch } from '@/lib/authFetch';
import { Icon } from '@/components/ui/icons';
import IconButton from '@/components/ui/IconButton';
import NotificationItem from '@/components/NotificationItem';
import { markRead, setUnread, useUnread, type Notice } from '@/lib/notifications';

/**
 * The bell in the header: a dot with the unread count, and a small panel
 * with the latest few. "See all" opens the full list in My account.
 */
export default function NotificationBell() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const unread = useUnread();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[] | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    authFetch('/me/notifications').then((r) => r.json()).then((d) => {
      if (Array.isArray(d?.items)) { setItems(d.items.slice(0, 6)); setUnread(d.unreadCount); }
    }).catch(() => setItems([]));
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const label = unread ? `${t('ntf.title')} · ${fill(t('ntf.unreadN'), { n: unread })}` : t('ntf.title');

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={label} title={label} aria-expanded={open} aria-haspopup="dialog"
        className={`relative inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${open ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
        <Icon name="bell" className={`w-5 h-5 ${unread ? 'origin-top animate-[wag_1.2s_ease-in-out_1]' : ''}`} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-white tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label={t('ntf.title')}
          className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:right-0 sm:mt-2 z-50 sm:w-[360px] rounded-3xl bg-white ring-1 ring-gray-200/80 shadow-[0_12px_40px_-12px_rgba(36,48,58,0.25)] animate-[fadeUp_0.15s_ease-out] overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
            <p className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
              {t('ntf.title')}
              {unread > 0 && <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 rounded-full px-2 py-0.5">{unread}</span>}
            </p>
            {unread > 0 && (
              <IconButton icon="check" size="sm" label={t('ntf.readAll')}
                onClick={() => { setItems((l) => l?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? l); markRead().catch(() => {}); }} />
            )}
          </div>
          <div className="max-h-[min(420px,65vh)] overflow-y-auto px-2 pb-2">
            {items === null ? (
              <div className="space-y-2 p-2" aria-hidden="true">
                {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />)}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center px-6 py-8">
                <span className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center"><Icon name="bell" className="w-6 h-6" /></span>
                <p className="text-[13px] font-semibold text-gray-800">{t('ntf.empty')}</p>
                <p className="text-[12px] text-gray-500 mt-1">{t('ntf.emptySub')}</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {items.map((n) => (
                  <NotificationItem key={n.id} n={n} compact onOpen={() => setOpen(false)}
                    onChange={(next) => setItems((l) => (l ?? []).flatMap((x) => (x.id === n.id ? (next ? [next] : []) : [x])))} />
                ))}
              </ul>
            )}
          </div>
          <Link href="/account/notifications" onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 border-t border-gray-100 py-3 text-[12.5px] font-semibold text-teal-700 hover:bg-teal-50/60">
            {t('ntf.seeAll')}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </Link>
        </div>
      )}
    </div>
  );
}
