'use client';
import { formatDate } from '@/lib/dates';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { Icon } from '@/components/ui/icons';
import IconButton from '@/components/ui/IconButton';
import { markRead, removeNotice, type Notice } from '@/lib/notifications';

/** Icon and soft colour tile for each kind of notification. */
const LOOK: Record<string, { icon: string; tile: string }> = {
  WELCOME:         { icon: 'sparkle',  tile: 'bg-lilac-100 text-lilac-600' },
  ORDER_PAID:      { icon: 'check',    tile: 'bg-teal-50 text-teal-700' },
  PAYMENT_FAILED:  { icon: 'alert',    tile: 'bg-red-50 text-red-500' },
  ORDER_SHIPPED:   { icon: 'truck',    tile: 'bg-sky-50 text-sky-600' },
  ORDER_DELIVERED: { icon: 'box',      tile: 'bg-teal-50 text-teal-700' },
  RENEWAL_DUE:     { icon: 'calendar', tile: 'bg-amber-50 text-amber-600' },
  BOX_SHIPPED:     { icon: 'truck',    tile: 'bg-sky-50 text-sky-600' },
  BOX_DELIVERED:   { icon: 'box',      tile: 'bg-peach-100 text-peach-600' },
  GIFT_SENT:       { icon: 'gift',     tile: 'bg-lilac-100 text-lilac-600' },
  REFUNDED:        { icon: 'undo',     tile: 'bg-amber-50 text-amber-600' },
  REFERRAL_REWARD: { icon: 'coin',     tile: 'bg-peach-100 text-peach-600' },
};

const money = (n: unknown) => Number(n ?? 0).toFixed(2).replace(/\.00$/, '');

/** Title and line of text for one notification, in the current language. */
export function useWording() {
  const { t, lang } = useLanguage();
  return (n: Notice) => {
    const d = n.data ?? {};
    const vars: Record<string, string | number> = {
      n: String(d.orderId ?? '').slice(-8).toUpperCase(),
      total: money(d.total), amount: money(d.amount),
      name: d.firstName ?? '', dog: d.dogName ?? '', recipient: d.recipient ?? '',
      box: d.boxNumber ?? '', of: d.boxesTotal ?? '', code: d.couponCode ?? '',
      plan: (lang === 'ka' ? d.plan?.ka : d.plan?.en) ?? '',
      date: d.renewsOn ? formatDate(new Date(d.renewsOn), lang, { day: 'numeric', month: 'long' }) : '',
    };
    let titleKey = `ntf.${n.type}.t`;
    if ((n.type === 'BOX_SHIPPED' || n.type === 'BOX_DELIVERED') && d.gift && d.recipient) titleKey = `ntf.${n.type}.tGift`;
    else if ((n.type === 'BOX_SHIPPED' || n.type === 'BOX_DELIVERED') && !d.dogName) titleKey = `ntf.${n.type}.tNoDog`;
    let body = fill(t(n.type === 'PAYMENT_FAILED' && d.kind === 'RENEWAL' ? 'ntf.PAYMENT_FAILED.renewal' : `ntf.${n.type}.b`), vars);
    if (d.tracking && (n.type === 'ORDER_SHIPPED' || n.type === 'BOX_SHIPPED')) body += ` ${lang === 'ka' ? 'თრექინგი' : 'Tracking'}: ${d.tracking}`;
    return { title: fill(t(titleKey), vars), body };
  };
}

/** "Just now", "5 min ago", "Yesterday", or the date. */
export function useAgo() {
  const { t, lang } = useLanguage();
  return (iso: string) => {
    const at = new Date(iso);
    const mins = Math.floor((Date.now() - at.getTime()) / 60_000);
    if (mins < 1) return t('ntf.now');
    if (mins < 60) return fill(t('ntf.min'), { n: mins });
    if (mins < 24 * 60 && at.getDate() === new Date().getDate()) return fill(t('ntf.hour'), { n: Math.floor(mins / 60) });
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (at.toDateString() === y.toDateString()) return t('ntf.yesterday');
    return formatDate(at, lang, { day: 'numeric', month: 'short' });
  };
}

/**
 * One row: coloured icon, title, text and time, with an unread dot. Tapping
 * it marks it read and opens where it points. `onChange` lets the list
 * update itself.
 */
export default function NotificationItem({ n, compact, onChange, onOpen }: {
  n: Notice;
  compact?: boolean;
  onChange: (n: Notice | null) => void;
  onOpen?: () => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const word = useWording();
  const ago = useAgo();
  const { title, body } = word(n);
  const look = LOOK[n.type] ?? { icon: 'bell', tile: 'bg-gray-100 text-gray-500' };
  const unread = !n.readAt;

  function open() {
    if (unread) { onChange({ ...n, readAt: new Date().toISOString() }); markRead(n.id).catch(() => {}); }
    onOpen?.();
    if (n.link) router.push(n.link);
  }

  return (
    <li className={`group relative flex gap-3 rounded-2xl transition-colors ${compact ? 'p-2.5' : 'p-3.5'} ${unread ? 'bg-teal-50/50 hover:bg-teal-50' : 'hover:bg-gray-50'}`}>
      <button type="button" onClick={open} className="absolute inset-0 rounded-2xl" aria-label={title} />
      <span className={`relative shrink-0 rounded-xl flex items-center justify-center ${compact ? 'w-9 h-9' : 'w-10 h-10'} ${look.tile}`}>
        <Icon name={look.icon} className="w-[18px] h-[18px]" />
      </span>
      <div className="relative flex-1 min-w-0 pointer-events-none">
        <p className={`text-[13px] leading-snug ${unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{title}</p>
        <p className={`text-[12px] text-gray-500 leading-snug mt-0.5 ${compact ? 'line-clamp-2' : ''}`}>{body}</p>
        <p className="text-[11px] text-gray-400 mt-1">{ago(n.createdAt)}</p>
      </div>
      <div className="relative flex flex-col items-end justify-between shrink-0">
        {unread ? <span className="w-2 h-2 mt-1.5 rounded-full bg-teal-500" aria-label={t('ntf.unread')} /> : <span />}
        {!compact && (
          <span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex">
            {unread && <IconButton icon="check" size="sm" label={t('ntf.markRead')} onClick={() => { onChange({ ...n, readAt: new Date().toISOString() }); markRead(n.id).catch(() => {}); }} />}
            <IconButton icon="trash" size="sm" tone="danger" label={t('ntf.remove')} onClick={() => { onChange(null); removeNotice(n.id).catch(() => {}); }} />
          </span>
        )}
      </div>
    </li>
  );
}
