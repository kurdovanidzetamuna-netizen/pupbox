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
  WELCOME:         { icon: 'sparkle',  tile: 'bg-lilac-50 text-lilac-600' },
  ORDER_PAID:      { icon: 'check',    tile: 'bg-teal-50 text-teal-700' },
  PAYMENT_FAILED:  { icon: 'alert',    tile: 'bg-red-50 text-red-500' },
  ORDER_SHIPPED:   { icon: 'truck',    tile: 'bg-teal-50 text-teal-700' },
  ORDER_DELIVERED: { icon: 'home',     tile: 'bg-teal-50 text-teal-700' },
  RENEWAL_DUE:     { icon: 'calendar', tile: 'bg-teal-50 text-teal-700' },
  BOX_SHIPPED:     { icon: 'truck',    tile: 'bg-teal-50 text-teal-700' },
  BOX_DELIVERED:   { icon: 'box',      tile: 'bg-teal-50 text-teal-700' },
  GIFT_SENT:       { icon: 'gift',     tile: 'bg-lilac-50 text-lilac-600' },
  REFUNDED:        { icon: 'undo',     tile: 'bg-teal-50 text-teal-700' },
  REFERRAL_REWARD: { icon: 'coin',     tile: 'bg-lilac-50 text-lilac-600' },
  EXTRA_CHARGE:    { icon: 'card',     tile: 'bg-amber-50 text-amber-700' },
  MESSAGE:         { icon: 'bell',     tile: 'bg-teal-50 text-teal-700' },
};

/** A message from the team carries its own words in both languages. */
const own = (v: any, lang: string) => (v && typeof v === 'object' ? (lang === 'en' ? v.en || v.ka : v.ka || v.en) : '') || '';

/** Opens a notification's link: pages on the site in-app, other sites in a new tab. */
function go(router: { push: (u: string) => void }, link: string) {
  if (/^https?:\/\//.test(link)) window.open(link, '_blank', 'noopener');
  else router.push(link);
}

const money = (n: unknown) => Number(n ?? 0).toFixed(2).replace(/\.00$/, '');

/** Title and line of text for one notification, in the current language. */
export function useWording() {
  const { t, lang } = useLanguage();
  return (n: Notice) => {
    const d = n.data ?? {};
    if (n.type === 'MESSAGE') return { title: own(d.title, lang), body: own(d.body, lang), cta: own(d.cta, lang) };
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
    return { title: fill(t(titleKey), vars), body, cta: '' };
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
 * One notification: coloured icon, title, text and time, with an unread dot.
 * Tapping it marks it read and opens where it points. `compact` is the small
 * row in the header bell; without it, the full card for the notifications page. `onChange` lets the list
 * update itself.
 */
export default function NotificationItem({ n, compact, onChange, onOpen, className = '', style }: {
  n: Notice;
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
  onChange: (n: Notice | null) => void;
  onOpen?: () => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const word = useWording();
  const ago = useAgo();
  const { title, body, cta } = word(n);
  const look = LOOK[n.type] ?? { icon: 'bell', tile: 'bg-gray-100 text-gray-500' };
  const unread = !n.readAt;

  function open() {
    if (unread) { onChange({ ...n, readAt: new Date().toISOString() }); markRead(n.id).catch(() => {}); }
    onOpen?.();
    if (n.link) go(router, n.link);
  }

  if (compact) return (
    <li style={style} className={`${className} group relative flex gap-3 rounded-2xl transition-colors p-2.5 ${unread ? 'bg-teal-50/50 hover:bg-teal-50' : 'hover:bg-gray-50'}`}>
      <button type="button" onClick={open} className="absolute inset-0 rounded-2xl" aria-label={title} />
      <span className={`relative shrink-0 rounded-xl flex items-center justify-center w-9 h-9 ${look.tile}`}>
        <Icon name={look.icon} className="w-[18px] h-[18px]" />
      </span>
      <div className="relative flex-1 min-w-0 pointer-events-none">
        <p className={`text-[13px] leading-snug ${unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{title}</p>
        <p className="text-[12px] text-gray-500 leading-snug mt-0.5 line-clamp-2">{body}</p>
        <p className="text-[11px] text-gray-400 mt-1">{ago(n.createdAt)}</p>
      </div>
      {unread && <span className="relative shrink-0 w-2 h-2 mt-1.5 rounded-full bg-teal-500" aria-label={t('ntf.unread')} />}
    </li>
  );

  // A row in the notifications page's list: unread ones carry a teal dot and
  // a faint tint. Mark-read and remove appear on hover (desktop); on phones
  // tapping the row marks it read, and "Mark all as read" is at the top.
  return (
    <li style={style} className={`${className} group relative flex items-start gap-3 pl-5 pr-3 sm:pr-4 py-3.5 transition-colors ${unread ? 'bg-teal-50/40 hover:bg-teal-50/70' : 'hover:bg-gray-50'}`}>
      {unread && <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-teal-500" aria-label={t('ntf.unread')} />}
      <button type="button" onClick={open} className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400" aria-label={title} />
      <span className={`relative shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${look.tile}`}>
        <Icon name={look.icon} className="w-[18px] h-[18px]" />
      </span>
      <div className="relative flex-1 min-w-0 pointer-events-none">
        <div className="flex items-baseline gap-2">
          <p className={`flex-1 min-w-0 text-[14px] leading-snug ${unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{title}</p>
          <span className={`shrink-0 text-[11.5px] whitespace-nowrap ${unread ? 'text-teal-700 font-semibold' : 'text-gray-400'}`}>{ago(n.createdAt)}</span>
        </div>
        <p className={`text-[13px] text-gray-500 leading-snug mt-0.5 ${cta ? '' : 'line-clamp-2'}`}>{body}</p>
        {cta && n.link && <span className="mt-2 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-teal-50 text-teal-700 text-[12.5px] font-semibold">{cta}<Icon name="arrow" className="w-3.5 h-3.5" /></span>}
      </div>
      <span className="relative self-center hidden sm:flex shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        {unread && <IconButton icon="check" size="sm" label={t('ntf.markRead')} onClick={() => { onChange({ ...n, readAt: new Date().toISOString() }); markRead(n.id).catch(() => {}); }} />}
        <IconButton icon="trash" size="sm" tone="danger" label={t('ntf.remove')} onClick={() => { onChange(null); removeNotice(n.id).catch(() => {}); }} />
      </span>
    </li>
  );
}
