'use client';
import { useState } from 'react';
import ProductThumb from '@/components/shop/ProductThumb';
import ChoiceNote from '@/components/ChoiceNote';
import IconButton from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/icons';
import { FieldError } from '@/components/ui/FormError';
import { formatDate } from '@/lib/dates';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch } from '@/lib/authFetch';
import { gel } from '@/lib/format';
import { itemName } from '@/lib/localize';

const STATUS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  PAID: 'bg-teal-50 text-teal-700',
  PROCESSING: 'bg-teal-50 text-teal-700',
  PACKED: 'bg-teal-50 text-teal-700',
  SHIPPED: 'bg-sky-50 text-sky-700',
  DELIVERED: 'bg-teal-600 text-white',
  CANCELLED: 'bg-gray-100 text-gray-500',
  REFUNDED: 'bg-gray-100 text-gray-500',
  FAILED: 'bg-red-50 text-red-600',
};

/** The road an order travels, shown as a small stepper while it's on it. */
const STEPS: [string, string][] = [['PAID', 'card'], ['PROCESSING', 'sparkle'], ['PACKED', 'box'], ['SHIPPED', 'truck'], ['DELIVERED', 'home']];

/**
 * Orders as compact cards: overlapping item photos, number and date, total
 * and status, and a stepper while the order is on its way. Tapping a card
 * opens everything about it.
 */
export default function OrdersList({ orders, onManagePlan }: { orders: any[]; onManagePlan: (subId: string) => void }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ul className="space-y-3">
      {orders.map((order, i) => {
        const isOpen = open === order.id;
        const step = STEPS.findIndex(([s]) => s === order.status);
        const count = order.items.reduce((n: number, it: any) => n + (it.quantity || 1), 0);
        const plan = order.subscription;
        return (
          <li key={order.id} className="bg-white rounded-3xl ring-1 ring-gray-200/60 hover:ring-teal-200 transition-colors animate-[fadeUp_0.4s_ease-out_both]" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
            <button type="button" onClick={() => setOpen(isOpen ? null : order.id)} aria-expanded={isOpen}
              className="w-full text-left flex items-center gap-3 sm:gap-4 p-4">
              <span className="flex -space-x-3 shrink-0">
                {order.items.slice(0, 3).map((item: any, k: number) => (
                  <span key={item.id} className="rounded-xl ring-2 ring-white bg-gray-50" style={{ zIndex: 3 - k }}>
                    <ProductThumb item={item} className="w-11 h-11 rounded-xl text-xl" />
                  </span>
                ))}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-extrabold text-gray-900">#{order.id.slice(-8).toUpperCase()}</span>
                  {plan && <span className="h-5 px-2 rounded-full bg-teal-50 text-teal-700 text-[10.5px] font-bold inline-flex items-center gap-1"><Icon name="repeat" className="w-3 h-3" strokeWidth={2.2} />{t('op.planOrder')}</span>}
                  {order.isGift && <span className="h-5 px-2 rounded-full bg-lilac-50 text-lilac-600 text-[10.5px] font-bold inline-flex items-center max-w-[140px] truncate">🎁 {order.giftRecipientName || t('sub.gift')}</span>}
                </span>
                <span className="block text-[12px] text-gray-500 truncate mt-0.5">
                  {formatDate(new Date(order.createdAt), lang, { day: 'numeric', month: 'short', year: 'numeric' })} · {fill(t('op.itemsN'), { n: count })}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[15px] font-extrabold text-gray-900">{gel(order.total)}</span>
                <span className={`mt-1 inline-flex h-5 px-2 rounded-full text-[10.5px] font-bold items-center ${STATUS[order.status] || STATUS.CANCELLED}`}>{t(`ord.status.${order.status}`, order.status)}</span>
              </span>
              <svg className={`w-4 h-4 shrink-0 text-gray-300 transition-transform ${isOpen ? 'rotate-180 text-teal-600' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>

            {step >= 0 && step < STEPS.length - 1 && (
              <ol className="flex items-center px-4 pb-4 -mt-1" aria-label={t(`ord.status.${order.status}`, order.status)}>
                {STEPS.map(([s, icon], k) => (
                  <li key={s} className={`flex items-center ${k < STEPS.length - 1 ? 'flex-1' : ''}`} title={t(`ord.status.${s}`, s)}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${k < step ? 'bg-teal-600 text-white' : k === step ? 'bg-teal-50 text-teal-700 ring-2 ring-teal-400 animate-[bob_1.6s_ease-in-out_infinite]' : 'bg-gray-100 text-gray-300'}`}>
                      <Icon name={k < step ? 'check' : icon} className="w-3.5 h-3.5" strokeWidth={2.2} />
                    </span>
                    {k < STEPS.length - 1 && <span className={`flex-1 h-0.5 mx-1 rounded-full ${k < step ? 'bg-teal-500' : 'bg-gray-100'}`} />}
                  </li>
                ))}
              </ol>
            )}

            {order.status === 'PENDING' && <PayRow orderId={order.id} />}

            {order.refund && (
              <p className="mx-4 mb-4 flex items-center gap-2 text-[12.5px] rounded-2xl px-3 py-2 bg-teal-50 text-teal-900">
                <Icon name="coin" className="w-4 h-4 shrink-0" />
                {order.refund.owed > 0
                  ? fill(t('ord.refundOwed'), { money: gel(order.refund.owed) })
                  : fill(t('ord.refunded'), { money: gel(order.refund.refunded), date: order.refund.refundedAt ? formatDate(new Date(order.refund.refundedAt), lang, { day: 'numeric', month: 'long' }) : '' })}
              </p>
            )}

            {isOpen && <OrderDetails order={order} onManagePlan={plan && ['ACTIVE', 'PAUSED'].includes(plan.status) && !plan.cancelledAt ? () => onManagePlan(plan.id) : undefined} />}
          </li>
        );
      })}
    </ul>
  );
}

/** Everything about one order: items with prices, money, address, payment, tracking. */
function OrderDetails({ order, onManagePlan }: { order: any; onManagePlan?: () => void }) {
  const { t, lang } = useLanguage();
  const a = order.address;
  const p = order.payments?.[0];
  const row = (label: string, value: React.ReactNode, strong = false) => (
    <div className={`flex justify-between gap-4 ${strong ? 'font-extrabold text-gray-900 pt-2 mt-1 border-t border-gray-200/70 text-[14px]' : 'text-gray-500'}`}><span>{label}</span><span>{value}</span></div>
  );
  return (
    <div className="mx-4 mb-4 grid md:grid-cols-2 gap-3 text-[13px] animate-[fadeUp_0.25s_ease-out]">
      <div className="rounded-2xl bg-gray-50 p-4">
        <ul className="space-y-2.5">
          {order.items.map((item: any) => (
            <li key={item.id} className="flex items-center gap-3">
              <ProductThumb item={item} className="w-9 h-9 rounded-lg text-lg shrink-0" />
              <span className="flex-1 min-w-0 text-gray-800"><span className="font-semibold">{itemName(item, lang) || item.name}</span> <span className="text-gray-400">× {item.quantity}</span><ChoiceNote choice={item.personalisation} /></span>
              <span className="text-gray-700 font-semibold whitespace-nowrap">{gel(item.total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t border-gray-200/70 space-y-1">
          {row(t('ord.subtotal'), gel(order.subtotal))}
          {Number(order.discountAmount) > 0 && row(t('ord.discount'), `−${gel(order.discountAmount)}`)}
          {row(t('ord.delivery'), Number(order.deliveryCost) > 0 ? gel(order.deliveryCost) : t('co.delivery.free'))}
          {row(t('ord.total'), gel(order.total), true)}
        </div>
      </div>
      <div className="space-y-3">
        {a && (
          <div className="rounded-2xl bg-gray-50 p-4 flex gap-3">
            <Icon name="pin" className="w-5 h-5 text-teal-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400">{t('ord.deliverTo')}</p>
              <p className="font-semibold text-gray-800">{a.firstName} {a.lastName} · {a.phone}</p>
              <p className="text-gray-500">{a.city}, {[a.addressLine1, a.addressLine2].filter(Boolean).join(', ')}</p>
            </div>
          </div>
        )}
        {(p || order.trackingNumber) && (
          <div className="rounded-2xl bg-gray-50 p-4 space-y-2">
            {p && (
              <div className="flex items-center gap-3">
                <Icon name="card" className="w-5 h-5 text-teal-600 shrink-0" />
                <span className="flex-1 text-gray-500">{t('ord.payment')}</span>
                <span className="font-semibold text-gray-800">{t(`ord.pay.${p.status}`, p.status)}{p.paidAt ? ` · ${formatDate(new Date(p.paidAt), lang, { day: 'numeric', month: 'short' })}` : ''}</span>
              </div>
            )}
            {order.trackingNumber && (
              <div className="flex items-center gap-3">
                <Icon name="truck" className="w-5 h-5 text-teal-600 shrink-0" />
                <span className="flex-1 text-gray-500">{t('ord.tracking')}</span>
                <span className="font-mono font-semibold text-gray-800">{order.trackingNumber}</span>
              </div>
            )}
          </div>
        )}
        {onManagePlan && (
          <div className="flex justify-end"><IconButton icon="settings" label={t('ord.managePlan')} onClick={onManagePlan} /></div>
        )}
      </div>
    </div>
  );
}

/** Only a PENDING order can be paid: a declined payment cancels the order and releases its stock. */
function PayRow({ orderId }: { orderId: string }) {
  const { t } = useLanguage();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  async function handlePay() {
    setPaying(true); setError('');
    try {
      const res = await authFetch(`/payments/initiate/${orderId}`, { method: 'POST' });
      const data = res.ok ? await res.json() : null;
      if (!data?.checkoutUrl) throw new Error();
      window.location.href = data.checkoutUrl;
    } catch {
      setError(t('ty.e.initiate'));
      setPaying(false);
    }
  }

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-amber-50 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Icon name="alert" className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="flex-1 text-[12.5px] font-semibold text-amber-900">{t('ord.status.PENDING')}</p>
        <IconButton icon="card" tone="primary" label={paying ? t('ord.redirecting') : t('ord.pay')} onClick={handlePay} disabled={paying} />
      </div>
      <FieldError message={error} />
    </div>
  );
}
