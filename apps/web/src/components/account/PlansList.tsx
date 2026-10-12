'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/dates';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import IconButton from '@/components/ui/IconButton';
import Menu from '@/components/ui/Menu';
import Modal from '@/components/ui/Modal';
import { Icon } from '@/components/ui/icons';
import { GIFT } from '@/lib/gift';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { planText } from '@/lib/localize';
import { gel } from '@/lib/format';
import Field from '@/components/ui/Field';
import PhoneInput, { isValidPhone } from '@/components/ui/PhoneInput';
import { FormAlert, countErrors, revealFirstError } from '@/components/ui/FormError';

const STATUS: Record<string, string> = {
  ACTIVE: 'bg-teal-50 text-teal-700',
  PENDING: 'bg-lilac-50 text-lilac-600',
  PAUSED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-50 text-red-600',
  EXPIRED: 'bg-gray-100 text-gray-500',
  PAYMENT_FAILED: 'bg-red-50 text-red-600',
};

/**
 * Box plans as cards: a tinted head with the plan, a row of little boxes
 * showing how many arrived, quick facts, then the address, renewal switch
 * and box history. Every action is an icon button.
 */
export default function PlansList({ subs, setSubs, toast, view = 'list' }: {
  view?: 'grid' | 'list';
  subs: any[];
  setSubs: React.Dispatch<React.SetStateAction<any[]>>;
  toast: (msg: string, ok?: boolean) => void;
}) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [cancelPlan, setCancelPlan] = useState<any>(null);
  const [addrFor, setAddrFor] = useState<any>(null);
  const [addr, setAddr] = useState({ firstName: '', lastName: '', phone: '', city: '', addressLine1: '', addressLine2: '' });
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState('');
  const [addrErrs, setAddrErrs] = useState<Record<string, string>>({});
  const [addrPhoneOk, setAddrPhoneOk] = useState(true);
  const setA = (k: keyof typeof addr) => (v: string) => { setAddr(a => ({ ...a, [k]: v })); setAddrError(''); setAddrErrs(e => ({ ...e, [k]: '' })); };

  const expired = () => router.replace(loginUrl('/account/orders?tab=plans'));
  const date = (d: string) => formatDate(new Date(d), lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const months = (n: number) => (n === 1 ? t('sub.month') : fill(t('sub.months'), { n }));
  const boxes = (n: number) => (n === 1 ? t('sub.box') : fill(t('sub.boxes'), { n }));

  async function toggleAutoRenewal(sub: any) {
    setToggling(sub.id);
    try {
      const res = await authFetch(`/me/subscriptions/${sub.id}/auto-renewal`, { method: 'PATCH', body: JSON.stringify({ enabled: !sub.autoRenewal }) });
      if (!res.ok) throw new Error();
      setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, autoRenewal: !s.autoRenewal } : s));
      toast(!sub.autoRenewal ? t('sub.renewOn') : t('sub.renewOff'));
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      toast(t('sub.renewFailed'), false);
    } finally { setToggling(null); }
  }

  function openAddress(sub: any) {
    const a = sub.address ?? {};
    setAddr({ firstName: a.firstName ?? '', lastName: a.lastName ?? '', phone: a.phone ?? '', city: a.city ?? '', addressLine1: a.addressLine1 ?? '', addressLine2: a.addressLine2 ?? '' });
    setAddrError(''); setAddrErrs({}); setAddrPhoneOk(isValidPhone(a.phone ?? ''));
    setAddrFor(sub);
  }

  async function saveAddress() {
    const sub = addrFor;
    const errs: Record<string, string> = {
      firstName: addr.firstName.trim() ? '' : t('co.e.firstName'),
      lastName: addr.lastName.trim() ? '' : t('co.e.lastName'),
      phone: addr.phone && addrPhoneOk ? '' : t(addr.phone ? 'reg.e.phone' : 'ui.e.phone'),
      city: addr.city.trim() ? '' : t('ui.e.city'),
      addressLine1: addr.addressLine1.trim() ? '' : t('ui.e.street'),
    };
    setAddrErrs(errs);
    if (countErrors(errs)) return revealFirstError();
    setAddrSaving(true); setAddrError('');
    try {
      const res = await authFetch(`/me/subscriptions/${sub.id}/address`, { method: 'PATCH', body: JSON.stringify({ ...addr, addressLine2: addr.addressLine2 || undefined }) });
      if (!res.ok) throw new Error();
      const r = await res.json();
      setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, address: { ...addr } } : s));
      setAddrFor(null);
      toast(r.alreadyPacked ? t('addr.savedPacked') : t('addr.saved'));
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      setAddrError(t('co.e.generic'));
    } finally { setAddrSaving(false); }
  }

  async function payRenewal(orderId: string) {
    setPaying(orderId);
    try {
      const res = await authFetch(`/payments/initiate/${orderId}`, { method: 'POST' });
      const data = res.ok ? await res.json() : null;
      if (!data?.checkoutUrl) throw new Error();
      window.location.href = data.checkoutUrl;
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      toast(t('ty.e.initiate'), false);
      setPaying(null);
    }
  }

  /** One more term, paid now; it starts when the current one ends. */
  async function extend(sub: any) {
    setPaying(sub.id);
    try {
      const res = await authFetch(`/me/subscriptions/${sub.id}/extend`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast(data.message || t('sub.extendFailed'), false); setPaying(null); return; }
      await payRenewal(data.orderId);
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      toast(t('sub.extendFailed'), false);
      setPaying(null);
    }
  }

  // From "Manage plan" on an order (?cancel=id): open that plan's cancel question.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('cancel');
    if (!id || !subs.some(s => s.id === id)) return;
    setOpen(id);
    document.getElementById(`sub-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    askCancel(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function askCancel(id: string) {
    setCancelPlan(null);
    setCancelConfirm(id);
    try {
      const res = await authFetch(`/me/subscriptions/${id}/cancel-preview`);
      if (res.ok) setCancelPlan(await res.json());
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
    }
  }

  function cancelText(p: any) {
    if (!p) return t('sub.cancelLoading');
    const money = gel(p.refund);
    if (p.kind === 'free') return fill(t('sub.cancelFree'), { hours: p.freeHours, money });
    const stopped = p.boxesTotal - p.keptBoxes;
    if (p.refund <= 0) return t(p.thisMonthBoxComing ? 'sub.cancelLastBox' : 'sub.cancelNoMore');
    return fill(t(p.thisMonthBoxComing ? 'sub.cancelKeep' : 'sub.cancelKeepSent'), { n: stopped, money });
  }

  async function cancelSubscription(id: string) {
    try {
      const res = await authFetch(`/me/subscriptions/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason: 'Cancelled by the customer' }) });
      if (!res.ok) throw new Error();
      const p = await res.json();
      const keeps = p.kind === 'keep' && p.thisMonthBoxComing;
      setSubs(prev => prev.map(s => s.id === id ? { ...s, status: keeps ? 'ACTIVE' : 'CANCELLED', cancelledAt: new Date().toISOString(), autoRenewal: false, nextRenewalAt: null, boxesTotal: p.kind === 'keep' ? p.keptBoxes : s.boxesTotal, refundPromised: p.refund } : s));
      setCancelConfirm(null);
      toast(p.refund > 0 ? fill(t('sub.cancelledRefund'), { money: gel(p.refund) }) : t('sub.cancelled'));
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      toast(t('sub.cancelFailed'), false);
    }
  }

  return (
    <>
      <ul className={`grid items-start ${view === 'grid' ? 'gap-4 md:grid-cols-2' : 'gap-2.5'}`}>
        {subs.map((sub, i) => {
          const live = !['CANCELLED', 'EXPIRED'].includes(sub.status);
          const isActive = sub.status === 'ACTIVE';
          const canToggle = ['ACTIVE', 'PENDING'].includes(sub.status) && !sub.cancelledAt && !sub.isGift;
          const due = sub.orders?.[0];
          const total = Number(sub.boxesTotal) || Number(sub.plan?.boxCount) || 1;
          const sent = Number(sub.boxesDelivered) || 0;
          const shipBy = new Map<number, any>((sub.shipments ?? []).map((b: any) => [b.boxNumber, b]));
          const head = sub.isGift ? GIFT.soft : live ? 'bg-teal-50' : 'bg-gray-50';
          const facts: [string, string, React.ReactNode][] = [
            ...(sub.startDate && new Date(sub.startDate) > new Date() ? [['calendar', t('sub.startsOn'), date(sub.startDate)] as [string, string, string]] : []),
            ['repeat', t(sub.nextRenewalAt ? 'sub.nextRenewal' : 'sub.endsOn'), sub.nextRenewalAt ? date(sub.nextRenewalAt) : sub.endDate ? date(sub.endDate) : '—'],
            ['coin', t('sub.price'), gel(sub.plan?.price)],
            ...(sub.dog ? [['paw', t('sub.dog'), sub.dog.name] as [string, string, string]] : []),
          ];
          return (
            <li key={sub.id} id={`sub-${sub.id}`} className="bg-white rounded-3xl ring-1 ring-gray-200/60 overflow-hidden animate-[fadeUp_0.4s_ease-out_both]" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
              {view === 'list' && (
                <div className="flex items-center gap-2 pr-3">
                  <button type="button" onClick={() => setOpen(open === sub.id ? null : sub.id)} aria-expanded={open === sub.id}
                    className="flex-1 min-w-0 flex items-center gap-3 sm:gap-4 p-3 text-left">
                    <span className={`w-11 h-11 shrink-0 rounded-2xl ${head} flex items-center justify-center text-[22px]`} aria-hidden="true">
                      <span className={`inline-block ${live ? 'animate-[bob_2.4s_ease-in-out_infinite]' : 'grayscale opacity-60'}`}>{sub.isGift ? '🎁' : '📦'}</span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-extrabold text-gray-900 truncate">{planText(sub.plan, 'name', lang)}</span>
                      <span className={`block text-[12px] truncate ${sub.isGift ? `${GIFT.text} font-semibold` : 'text-gray-500'}`}>
                        {sub.isGift ? (sub.giftFor ? fill(t('sub.giftFor'), { name: sub.giftFor }) : t('sub.gift')) : [sub.dog?.name, fill(t('sub.shape'), { months: months(Number(sub.plan?.durationValue) || 1), boxes: boxes(Number(sub.plan?.boxCount) || 1) })].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="hidden md:block w-28 shrink-0" title={t('sub.delivered')}>
                      <span className="flex items-center justify-between text-[11px] text-gray-400"><Icon name="box" className="w-3.5 h-3.5" /><span><b className="text-gray-900 text-[12.5px]">{sent}</b>/{total}</span></span>
                      <span className="block mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden"><span className="block h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, (sent / total) * 100)}%` }} /></span>
                    </span>
                    <span className="hidden sm:block w-28 shrink-0 text-right">
                      <span className="block text-[11px] text-gray-400">{t(sub.nextRenewalAt ? 'sub.nextRenewal' : 'sub.endsOn')}</span>
                      <span className="block text-[12.5px] font-bold text-gray-800">{sub.nextRenewalAt ? date(sub.nextRenewalAt) : sub.endDate ? date(sub.endDate) : '—'}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[14px] font-extrabold text-gray-900">{gel(sub.plan?.price)}</span>
                      <span className={`mt-0.5 inline-flex h-5 px-2 rounded-full text-[10.5px] font-bold items-center gap-1 ${STATUS[sub.status] || STATUS.PENDING}`}>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />}{t(`sub.status.${sub.status}`, sub.status)}
                      </span>
                    </span>
                    {due && <span className="w-2 h-2 rounded-full bg-lilac-600 shrink-0" title={t('ord.status.PENDING')} />}
                    <svg className={`w-4 h-4 shrink-0 text-gray-300 transition-transform ${open === sub.id ? 'rotate-180 text-teal-600' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {isActive && !sub.cancelledAt && (
                    <Menu label={planText(sub.plan, 'name', lang)} items={[
                      { icon: 'pin', label: t('addr.change'), onClick: () => openAddress(sub) },
                      { icon: 'trash', label: t('sub.cancel'), tone: 'danger' as const, onClick: () => askCancel(sub.id) },
                    ]} />
                  )}
                </div>
              )}
              {/* Head (grid card) */}
              {view === 'grid' && <div className={`${head} px-5 pt-5 pb-4`}>
                <div className="flex items-start gap-3">
                  <span className="w-12 h-12 shrink-0 rounded-2xl bg-white flex items-center justify-center text-[26px]" aria-hidden="true">
                    <span className={`inline-block ${live ? 'animate-[bob_2.4s_ease-in-out_infinite]' : 'grayscale opacity-60'}`}>{sub.isGift ? '🎁' : '📦'}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-extrabold text-gray-900 text-[16px] leading-tight truncate">{planText(sub.plan, 'name', lang)}</h2>
                    <p className="text-[12.5px] text-gray-500 mt-0.5">{fill(t('sub.shape'), { months: months(Number(sub.plan?.durationValue) || 1), boxes: boxes(Number(sub.plan?.boxCount) || 1) })}</p>
                    {sub.isGift && <p className={`text-[12px] font-bold ${GIFT.text} mt-0.5 truncate`}>{sub.giftFor ? fill(t('sub.giftFor'), { name: sub.giftFor }) : t('sub.gift')}</p>}
                  </div>
                  <span className={`shrink-0 h-6 px-2.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${STATUS[sub.status] || STATUS.PENDING}`}>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />}
                    {t(`sub.status.${sub.status}`, sub.status)}
                  </span>
                  {isActive && !sub.cancelledAt && (
                    <Menu label={planText(sub.plan, 'name', lang)} items={[
                      { icon: 'pin', label: t('addr.change'), onClick: () => openAddress(sub) },
                      { icon: 'trash', label: t('sub.cancel'), tone: 'danger' as const, onClick: () => askCancel(sub.id) },
                    ]} />
                  )}
                </div>

                {/* Little boxes: one per box in the plan */}
                <div className="mt-4 flex items-center gap-3">
                  <ol className="flex flex-wrap gap-1.5 flex-1">
                    {Array.from({ length: Math.min(total, 12) }, (_, k) => {
                      const b = shipBy.get(k + 1);
                      const done = k < sent || b?.status === 'DELIVERED';
                      const going = !done && b?.status === 'SHIPPED';
                      const label = `${fill(t('sub.boxN'), { n: k + 1 })}${b ? ` · ${t(`sub.box.${b.status}`, b.status)}` : ''}`;
                      return (
                        <li key={k} title={label} aria-label={label}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${done ? 'bg-teal-600 text-white' : going ? 'bg-white text-teal-600 ring-2 ring-teal-300 animate-[bob_1.6s_ease-in-out_infinite]' : 'bg-white/80 text-gray-300'}`}>
                          <Icon name={going ? 'truck' : 'box'} className="w-3.5 h-3.5" strokeWidth={2} />
                        </li>
                      );
                    })}
                  </ol>
                  <p className="shrink-0 text-[12px] text-gray-500"><span className="text-[15px] font-extrabold text-gray-900">{sent}</span>/{total}</p>
                </div>
              </div>}

              {(view === 'grid' || open === sub.id) && <div className={`p-5 space-y-3 ${view === 'list' ? 'border-t border-gray-100 animate-[fadeIn_0.2s_ease-out]' : ''}`}>
                {/* Facts */}
                <dl className={`grid gap-2 ${facts.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                  {facts.map(([icon, k, v]) => (
                    <div key={k} className="rounded-2xl bg-gray-50 px-3 py-2.5 min-w-0">
                      <dt className="flex items-center gap-1 text-[11px] text-gray-400 truncate"><Icon name={icon} className="w-3.5 h-3.5 shrink-0" />{k}</dt>
                      <dd className="text-[13px] font-bold text-gray-900 truncate mt-0.5">{v}</dd>
                    </div>
                  ))}
                </dl>

                {due && (
                  <div className="flex items-center gap-3 rounded-2xl bg-lilac-50 px-4 py-3">
                    <Icon name="alert" className="w-5 h-5 text-lilac-600 shrink-0" />
                    <p className="flex-1 text-[12.5px] text-lilac-600">{fill(t('sub.renewalDue'), { date: due.renewalFor ? date(due.renewalFor) : '', money: gel(due.total) })}</p>
                    <IconButton icon="card" tone="primary" label={paying === due.id ? t('ty.redirecting') : fill(t('sub.renewalPay'), { money: gel(due.total) })} onClick={() => payRenewal(due.id)} disabled={paying === due.id} />
                  </div>
                )}

                {live && (
                  <div className="flex items-center gap-3 rounded-2xl ring-1 ring-gray-100 px-4 py-3">
                    <Icon name="pin" className="w-5 h-5 text-teal-600 shrink-0" />
                    <div className="flex-1 min-w-0 text-[12.5px]">
                      {sub.address ? (<>
                        <p className="font-semibold text-gray-800 truncate">{sub.address.firstName} {sub.address.lastName} · {sub.address.phone}</p>
                        <p className="text-gray-500 truncate">{sub.address.city}, {[sub.address.addressLine1, sub.address.addressLine2].filter(Boolean).join(', ')}</p>
                      </>) : <p className="text-lilac-600 font-semibold">{t('addr.missing')}</p>}
                    </div>
                    <IconButton icon="edit" label={t('addr.change')} size="sm" onClick={() => openAddress(sub)} />
                  </div>
                )}

                {canToggle && (
                  <div className="flex items-center gap-3 rounded-2xl ring-1 ring-gray-100 px-4 py-3">
                    <Icon name="repeat" className={`w-5 h-5 shrink-0 ${sub.autoRenewal ? 'text-teal-600' : 'text-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900">{t('sub.autoRenewal')}</p>
                      <p className="text-[11.5px] text-gray-500">
                        {sub.autoRenewal ? (sub.nextRenewalAt ? fill(t('sub.renewsOn'), { date: date(sub.nextRenewalAt) }) : t('sub.renewsAuto')) : t('sub.noRenew')}
                      </p>
                    </div>
                    <button onClick={() => toggleAutoRenewal(sub)} disabled={toggling === sub.id} role="switch" aria-checked={!!sub.autoRenewal} aria-label={t('sub.autoRenewal')}
                      className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${sub.autoRenewal ? 'bg-teal-600' : 'bg-gray-200'} ${toggling === sub.id ? 'opacity-50' : ''}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${sub.autoRenewal ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                )}

                {isActive && !sub.cancelledAt && !due && (
                  <div className="flex items-center gap-3 rounded-2xl bg-teal-50/60 px-4 py-3">
                    <Icon name="plus" className="w-5 h-5 text-teal-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900">{t('sub.extend')}</p>
                      <p className="text-[11.5px] text-gray-500">{fill(t('sub.extendSub'), { period: months(Number(sub.plan?.durationValue) || 1), money: gel(sub.plan?.price) })}</p>
                    </div>
                    <IconButton icon="card" tone="primary" label={paying === sub.id ? t('ty.redirecting') : fill(t('sub.extendGo'), { money: gel(sub.plan?.price) })} onClick={() => extend(sub)} disabled={paying === sub.id} />
                  </div>
                )}

                {isActive && sub.cancelledAt && (
                  <p className="flex items-center gap-2 text-[12.5px] text-lilac-600 bg-lilac-50 rounded-2xl px-4 py-3"><Icon name="info" className="w-4 h-4 shrink-0" />{t('sub.cancelledLast')}</p>
                )}

                {sub.shipments?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">{t('sub.history')}</p>
                    <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 pb-1">
                      {sub.shipments.map((b: any) => {
                        const ok = b.status === 'SHIPPED' || b.status === 'DELIVERED';
                        return (
                          <li key={b.id} className={`shrink-0 rounded-2xl px-3 py-2 min-w-[112px] ${ok ? 'bg-teal-50' : 'bg-gray-50'}`} title={b.trackingNumber ? `${t('sub.tracking')}: ${b.trackingNumber}` : undefined}>
                            <p className="text-[12.5px] font-bold text-gray-900">{fill(t('sub.boxN'), { n: b.boxNumber })}</p>
                            <p className="text-[11px] text-gray-400">{formatDate(new Date(b.year, b.month - 1, 1), lang, { month: 'long', year: 'numeric' })}</p>
                            <p className={`mt-1 text-[11px] font-bold flex items-center gap-1 ${ok ? 'text-teal-700' : 'text-gray-500'}`}>
                              <Icon name={b.status === 'DELIVERED' ? 'check' : ok ? 'truck' : 'box'} className="w-3.5 h-3.5" strokeWidth={2} />{t(`sub.box.${b.status}`, b.status)}
                            </p>
                            {b.trackingNumber && <p className="text-[10.5px] text-gray-400 font-mono truncate max-w-[140px]">{b.trackingNumber}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>}
            </li>
          );
        })}
      </ul>

      <Modal open={!!addrFor} onClose={() => setAddrFor(null)} title={t('op.address')} size="md"
        footer={<>
          <IconButton icon="close" label={t('dogs.cancel')} onClick={() => setAddrFor(null)} />
          <IconButton icon="check" label={addrSaving ? t('co.saving') : t('addr.save')} tone="primary" onClick={saveAddress} disabled={addrSaving} />
        </>}>
        {addrFor && (
          <form onSubmit={e => { e.preventDefault(); saveAddress(); }} noValidate className="grid sm:grid-cols-2 gap-3">
            {(addrError || countErrors(addrErrs) > 0) && <FormAlert message={addrError} missing={countErrors(addrErrs)} className="sm:col-span-2" />}
            <Field id="pa-first" label={t('co.f.firstName')} value={addr.firstName} onChange={setA('firstName')} autoComplete="given-name" required error={addrErrs.firstName} />
            <Field id="pa-last" label={t('co.f.lastName')} value={addr.lastName} onChange={setA('lastName')} autoComplete="family-name" required error={addrErrs.lastName} />
            <div className="sm:col-span-2">
              <PhoneInput floatLabel id="pa-phone" label={t('co.f.phone')} value={addr.phone} required error={addrErrs.phone}
                onChange={(v, ok) => { setA('phone')(v); setAddrPhoneOk(ok); }} />
            </div>
            <Field id="pa-city" label={t('co.f.city')} value={addr.city} onChange={setA('city')} autoComplete="address-level2" required error={addrErrs.city} />
            <Field id="pa-line1" label={t('co.f.address')} value={addr.addressLine1} onChange={setA('addressLine1')} autoComplete="address-line1" required error={addrErrs.addressLine1} />
            <div className="sm:col-span-2">
              <Field id="pa-line2" label={t('co.f.address2')} value={addr.addressLine2} onChange={setA('addressLine2')} autoComplete="address-line2" />
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!cancelConfirm} onClose={() => setCancelConfirm(null)} onConfirm={() => cancelSubscription(cancelConfirm!)}
        busy={!cancelPlan} tone="danger" title={t('sub.cancelQ')} confirmLabel={t('sub.cancelYes')}
        message={<><p>{cancelText(cancelPlan)}</p>{cancelPlan?.refund > 0 && <p className="text-xs text-gray-500">{t('sub.refundTiming')}</p>}</>} />
    </>
  );
}
