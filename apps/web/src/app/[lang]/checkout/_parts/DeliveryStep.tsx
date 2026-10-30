'use client';
import MapPicker from '@/components/MapPicker';
import { formatDate } from '@/lib/dates';
import Link from '@/components/LangLink';
import { fill } from '@/context/strings/purchase';
import { gel } from '@/lib/format';
import PhoneInput from '@/components/ui/PhoneInput';
import { FieldError, FormAlert, countErrors } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/icons';

import { OptionCard } from './shared';
import type { Checkout } from './useCheckout';

/** Where it goes, how it gets there, renewing or not, and paying. */
export function DeliveryStep({ co }: { co: Checkout }) {
  const { t, lang, loading, saveCard, setSaveCard, pin, setPin, error, errs, setErrs, setDeliveryPhoneOk, signedInEmail, form, setForm, giftDog, giftLater, makeMain, setMakeMain, phoneKey, deliveryMethods, selectedDelivery, setSelectedDelivery, autoRenewal, setAutoRenewal, isGift, fillAddress, update, pay, total, addrChoices, chosenAddr, plan, offersRenewal, period, input, actions, card } = co;
  return (
    <section className={card}>
      {isGift && (
        <div className="mb-6 bg-lilac-50 rounded-[18px] p-4">
          <p className="text-sm font-bold text-lilac-600">{fill(t('co.gift.for'), { name: form.giftRecipientName })}</p>
          {giftDog.name && <p className="text-xs text-gray-600 flex items-center gap-1"><Icon name="paw" className="w-3.5 h-3.5" />{giftDog.name}</p>}
          {form.giftRecipientEmail && <p className="text-xs text-gray-600">{form.giftRecipientEmail}</p>}
          {form.giftMessage && <p className="text-xs italic text-gray-600 mt-2">“{form.giftMessage}”</p>}
          {giftLater && form.giftSendOn && <p className="text-xs text-gray-600 mt-2 flex items-center gap-1"><Icon name="calendar" className="w-3.5 h-3.5" />{fill(t('co.gift.sendsOn'), { date: formatDate(new Date(`${form.giftSendOn}T09:00:00+04:00`), lang, { day: 'numeric', month: 'long', year: 'numeric' }) })}</p>}
          <p className="text-xs text-lilac-600 mt-2 pt-2 border-t border-lilac-100">{fill(t('co.gift.billingNote'), { name: form.giftRecipientName })}</p>
        </div>
      )}
      <Heading kind="form" as="h1" title={isGift ? t('co.delivery.giftTitle') : t('co.delivery.title')}
        subtitle={signedInEmail ? fill(t('co.signedInAs'), { email: signedInEmail }) : undefined} />
      {/* Saved addresses: one tap instead of typing it all again */}
      {addrChoices.length > 0 && (
        <fieldset className="mb-5">
          <legend className="block px-1 text-[12.5px] font-semibold text-gray-700 mb-2">{isGift ? t('co.addr.giftSaved') : t('co.addr.saved')}</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {addrChoices.map(a => (
              <OptionCard key={a.id} name="savedAddress" checked={chosenAddr?.id === a.id} onChange={() => fillAddress(a)}>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-gray-900 min-w-0">
                    <span className="truncate">{a.isGift ? `${a.firstName} ${a.lastName}` : a.label || `${a.firstName} ${a.lastName}`}</span>
                    {a.isDefault && <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5"><Icon name="star" className="w-2.5 h-2.5 [&_path]:fill-current" strokeWidth={2.4} />{t('addr.default')}</span>}
                  </span>
                  <span className="block text-[12px] text-gray-500 truncate">{[a.city, a.addressLine1, a.addressLine2].filter(Boolean).join(', ')}</span>
                </span>
              </OptionCard>
            ))}
            <OptionCard name="savedAddress" checked={!chosenAddr} onChange={() => { if (chosenAddr) fillAddress(null); }}>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-gray-900 flex items-center gap-1.5"><Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2.6} />{t('co.addr.new')}</span>
                <span className="block text-[12px] text-gray-500">{t('co.addr.newSub')}</span>
              </span>
            </OptionCard>
          </div>
        </fieldset>
      )}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {input('firstName', t('co.f.firstName'), { autoComplete: 'given-name' })}
          {input('lastName', t('co.f.lastName'), { autoComplete: 'family-name' })}
        </div>
        {/* Mounts with the step, after any prefill, so the picker shows that number's country. */}
        <PhoneInput key={phoneKey} id="phone" label={t('co.f.phone')} value={form.phone} required floatLabel error={errs.phone}
          onChange={(v, ok) => { setForm(f => ({ ...f, phone: v })); setDeliveryPhoneOk(ok || !v); setErrs(er => ({ ...er, phone: '' })); }} />
        <MapPicker value={pin} onPick={p => {
          setPin({ lat: p.lat, lng: p.lng });
          setForm(f => ({ ...f, ...(p.city !== undefined ? { city: p.city, addressLine1: p.street ?? '' } : {}) }));
          setErrs(er => ({ ...er, ...(p.city ? { city: '' } : {}), ...(p.street ? { addressLine1: '' } : {}) }));
        }} />
        <div className="grid sm:grid-cols-[1fr_2fr] gap-3">
          {input('city', t('co.f.city'), { autoComplete: 'address-level2' })}
          {input('addressLine1', t('co.f.address'), { hint: t('co.f.addressPh'), autoComplete: 'address-line1' })}
        </div>
        {input('addressLine2', t('co.f.address2'), { autoComplete: 'address-line2' })}
        {/* A new address of their own: name it, and make it the main one */}
        {!chosenAddr && !isGift && signedInEmail && (
          <div className="rounded-[18px] bg-gray-50 p-3.5 space-y-3">
            <div>
              {input('addressLabel', t('co.addr.name'), { hint: t('addr.labelHint') })}
              <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t('co.addr.name')}>
                {['addr.n.home', 'addr.n.work', 'addr.n.country', 'addr.n.family', 'addr.n.friend'].map(k => {
                  const name = t(k), on = form.addressLabel.trim() === name;
                  return (
                    <button key={k} type="button" aria-pressed={on} onClick={() => update('addressLabel', on ? '' : name)}
                      className={`h-8 px-3 rounded-full text-[12px] font-semibold transition-colors ${on ? 'bg-teal-600 text-white' : 'bg-white ring-1 ring-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
            {addrChoices.length > 0 && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={makeMain} onChange={e => setMakeMain(e.target.checked)} className="accent-teal-600 w-4 h-4" />
                <span className="flex items-center gap-1 text-[13px] font-semibold text-gray-800"><Icon name="star" className="w-3.5 h-3.5 text-amber-500 [&_path]:fill-current" />{t('co.addr.makeMain')}</span>
              </label>
            )}
          </div>
        )}
      </div>

      <h2 className="text-[15px] font-extrabold text-gray-900 mt-7 mb-3">{t('co.delivery.method')}</h2>
      <div className="space-y-2" role="radiogroup" aria-label={t('co.delivery.method')} aria-invalid={!!errs.delivery} tabIndex={errs.delivery ? -1 : undefined}>
        {deliveryMethods.map(m => {
          const days = String(m.estimatedDays ?? '');
          return (
            <OptionCard key={m.id} name="delivery" checked={selectedDelivery === m.id} invalid={!!errs.delivery}
              onChange={() => { setSelectedDelivery(m.id); setErrs(e => ({ ...e, delivery: '' })); }}>
              <span className="flex-1 flex items-center justify-between gap-3">
                <span>
                  <span className="block font-medium text-gray-900 text-sm">{(lang === 'ka' && (m.translations as { ka?: { name?: string } } | null)?.ka?.name) || t(`dm.${m.name}`, m.name)}</span>
                  {days && <span className="block text-xs text-gray-400">{days === '1' ? t('co.delivery.day') : fill(t('co.delivery.days'), { n: days })}</span>}
                </span>
              <span className="text-right">
                {m.couponOff > 0
                  ? <span className="block">
                      <span className="text-xs text-gray-400 line-through mr-1.5">{gel(m.effectivePrice)}</span>
                      {m.couponOff >= m.effectivePrice
                        ? <span className="text-teal-700 font-semibold text-sm">{t('co.delivery.couponFree')}</span>
                        : <span className="font-bold text-sm text-teal-700">{gel((m.effectivePrice - m.couponOff).toFixed(2))}</span>}
                    </span>
                : m.includedWithPlan
                  ? <span className="text-teal-700 font-semibold text-sm">{t('co.delivery.included')}</span>
                  : m.upgradeFromPlan
                    ? <span className="font-semibold text-sm text-gray-900">{fill(t('co.delivery.upgrade'), { amount: gel(m.effectivePrice) })}</span>
                  : m.isFree
                    ? <span className="text-teal-700 font-semibold text-sm">{t('co.delivery.free')}</span>
                    : <span className="font-bold text-sm">{gel(m.price)}</span>}
                {m.freeThreshold && !m.isFree && !m.couponOff && (
                  <span className="block text-xs text-gray-400">{fill(t('co.delivery.freeOver'), { amount: gel(m.freeThreshold) })}</span>
                )}
              </span>
              </span>
            </OptionCard>
          );
        })}
      </div>
      <FieldError message={errs.delivery} />

      {/* Renewal is spelled out — price and period — not just a tick. */}
      {offersRenewal && (
        <fieldset className="mt-6" aria-invalid={!!errs.renewal} tabIndex={errs.renewal ? -1 : undefined}>
          <legend className="text-[15px] font-extrabold text-gray-900 mb-3">{t('co.renew.choose')}</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { v: true, title: t('co.renew.yes'), desc: fill(t('co.renew.on'), { period, price: gel(plan?.price) }) },
              { v: false, title: t('co.renew.no'), desc: t('co.renew.off') },
            ].map(o => (
              <OptionCard key={String(o.v)} name="renewal" checked={autoRenewal === o.v} invalid={!!errs.renewal}
                onChange={() => { setAutoRenewal(o.v); setErrs(e => ({ ...e, renewal: '' })); }}>
                <span>
                  <span className="block font-semibold text-gray-900 text-[13.5px]">{o.title}</span>
                  <span className="block text-[12px] text-gray-500 mt-0.5">{o.desc}</span>
                </span>
              </OptionCard>
            ))}
          </div>
          <FieldError message={errs.renewal} />
        </fieldset>
      )}

      {/* ── Payment: the card is entered on the bank's secure page ── */}
      <h2 className="text-[15px] font-extrabold text-gray-900 mt-7 mb-3">{t('co.payTitle')}</h2>
      <div className="rounded-[18px] bg-teal-50 ring-1 ring-inset ring-teal-400 p-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-[13px] bg-white text-teal-600 flex items-center justify-center"><Icon name="card" className="w-[22px] h-[22px]" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] font-bold text-gray-900">{t('co.payCard')}</span>
            <span className="block text-[12px] text-gray-600 leading-snug">{t('co.payCardSub')}</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5" aria-hidden="true">
            <span className="h-6 px-1.5 rounded-md bg-white text-[10px] font-black italic text-[#1A1F71] flex items-center">VISA</span>
            <span className="h-6 w-9 rounded-md bg-white flex items-center justify-center"><span className="w-3 h-3 rounded-full bg-[#EB001B]" /><span className="w-3 h-3 -ml-1.5 rounded-full bg-[#F79E1B] mix-blend-multiply" /></span>
          </span>
        </div>
        <label className="mt-3 pt-3 border-t border-teal-100 flex items-center gap-3 cursor-pointer">
          <span className="relative inline-flex shrink-0">
            <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} className="peer sr-only" />
            <span className="w-10 h-6 rounded-full bg-gray-300 peer-checked:bg-teal-600 transition-colors" />
            <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
          </span>
          <span>
            <span className="block text-[13px] font-semibold text-gray-800">{t('co.saveCard')}</span>
            <span className="block text-[11.5px] text-gray-500 flex items-center gap-1"><Icon name="lock" className="w-3 h-3" />{t('co.saveCardHint')}</span>
          </span>
        </label>
      </div>
      <FormAlert message={error} missing={countErrors(errs)} className="mt-5" />
      {actions(<Button size="lg" icon="lock" onClick={pay} disabled={loading} label={loading ? t('co.placing') : fill(t('co.pay'), { price: gel(total.toFixed(2)) })} />)}
      <p className="text-xs text-gray-400 mt-3 text-center">
        {t('co.terms')} <Link href="/pages/terms" className="underline hover:text-teal-600">{t('co.termsLink')}</Link>.
      </p>
    </section>
  );
}
