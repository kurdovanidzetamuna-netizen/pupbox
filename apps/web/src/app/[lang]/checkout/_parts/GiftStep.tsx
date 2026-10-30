'use client';
import DogProfileForm from '@/components/DogProfileForm';
import { FormAlert, countErrors } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import DatePicker from '@/components/ui/DatePicker';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/icons';

import { Field, OptionCard, todayTbilisi, tomorrowTbilisi, inAYear } from './shared';
import type { Checkout } from './useCheckout';

/** A plan as a gift: who it is for, their dog, a note, and when it starts. */
export function GiftStep({ co }: { co: Checkout }) {
  const { t, error, errs, setErrs, form, giftDog, setGiftDog, giftLater, setGiftLater, update, submitGift, field, input, actions, card } = co;
  return (
    <section className={card}>
      <Heading kind="form" as="h1" title={t('co.gift.title')} subtitle={t('co.gift.sub')} />
      <div className="space-y-4">
        {input('giftRecipientName', t('co.gift.name'), { autoComplete: 'name' })}
        <div className="pt-2">
          <h2 className="text-[15px] font-bold text-gray-900">{t('co.gift.dogTitle')}</h2>
          <p className="text-xs text-gray-500 mb-3">{t('co.gift.dogSub')}</p>
          <DogProfileForm value={giftDog} onChange={d => { setGiftDog(d); setErrs(e => ({ ...e, dogName: '', dogSize: d.size ? '' : e.dogSize })); }} compact nameError={errs.dogName} sizeError={errs.dogSize} />
        </div>
        {input('giftRecipientEmail', t('co.gift.email'), { type: 'email', hint: t('co.gift.emailHint') })}
        <Field id="giftMessage" label={t('co.gift.message')} hint={`${form.giftMessage.length}/1000`} error={errs.giftMessage}>
          <textarea id="giftMessage" value={form.giftMessage} onChange={e => update('giftMessage', e.target.value)} rows={3} maxLength={1000}
            placeholder={t('co.gift.messagePh')} className={`${field('giftMessage')} resize-y`} />
        </Field>
        <fieldset>
          <legend className="block px-1 text-[12.5px] font-semibold text-gray-700 mb-2">{t('co.gift.when')}</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {([false, true] as const).map(later => (
              <OptionCard key={String(later)} name="giftWhen" checked={giftLater === later} onChange={() => { setGiftLater(later); if (later && !form.giftSendOn) update('giftSendOn', tomorrowTbilisi()); }}>
                <span className="text-[13.5px] font-semibold text-gray-900">{later ? t('co.gift.later') : t('co.gift.now')}</span>
              </OptionCard>
            ))}
          </div>
          {giftLater && (
            <div className="mt-2">
              <DatePicker id="giftSendOn" required label={t('co.gift.date')} hint={t('co.gift.dateHint')} error={errs.giftSendOn}
                value={form.giftSendOn} onChange={v => update('giftSendOn', v)} min={todayTbilisi()} max={inAYear()} />
            </div>
          )}
        </fieldset>
      </div>
      <p className="mt-5 bg-lilac-50 rounded-[16px] px-4 py-3 text-[12.5px] text-lilac-600 flex gap-2"><Icon name="gift" className="w-4 h-4 shrink-0 mt-0.5" />{t('co.gift.note')}</p>
      <FormAlert message={error} missing={countErrors(errs)} className="mt-4" />
      {actions(<Button size="lg" icon="arrow" onClick={submitGift} label={t('co.continue').replace(/\s*→\s*$/, '')} />)}
    </section>
  );
}
