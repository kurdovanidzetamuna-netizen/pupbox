'use client';
import { type Pin } from '@/components/MapPicker';
import { useState, useEffect, useRef } from 'react';
import { track, itemsOf, trackingForOrder } from '@/lib/tracking';
import { useRouter } from 'next/navigation';
import { useCart, cartHeaders } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { gel } from '@/lib/format';
import { itemName } from '@/lib/localize';
import { emptyDogProfile, toDogPayload, type DogProfile } from '@/components/DogProfileForm';
import ChoiceNote from '@/components/ChoiceNote';
import { type PhoneConfirmed } from '@/components/PhoneOtpField';
import { storedReferral } from '@/lib/referral';
import { countErrors, revealFirstError } from '@/components/ui/FormError';
import TextField from '@/components/ui/Field';
import { Icon } from '@/components/ui/icons';
import { apiError as apiMessage, savedToken as getToken } from '@/lib/authFetch';
import { API_URL } from '@/lib/api';

import { EMAIL_RE, StepKey, SavedAddress, sameAddress, todayTbilisi, inAYear } from './shared';
import type { Api } from '@pupbox/content';

/**
 * Everything the checkout knows and does: the steps, the form, the
 * customer's saved dogs and addresses, delivery options and the prices the
 * server gives for them, and paying. The page and its steps only show it.
 */
export function useCheckout() {
  const { t, lang } = useLanguage();
  const { cart, ready, refresh } = useCart();
  const router = useRouter();

  // Read once on arrival, client-side, so server and client render alike.
  const [arrival, setArrival] = useState<{ signedIn: boolean; gift: boolean } | null>(null);
  const [step, setStep] = useState<StepKey | null>(null);
  // Set once the order exists, so emptying the cart on the way to payment
  // doesn't flash the empty-cart screen.
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [loading, setLoading] = useState(false);
  // Keep the card with the bank for renewals and next orders (the customer can untick).
  const [saveCard, setSaveCard] = useState(true);
  // Where on the map the box goes (optional; helps the courier).
  const [pin, setPin] = useState<Pin | null>(null);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});

  const [isNewAccount, setIsNewAccount] = useState(true);
  // Signed up or in, but phone and email not confirmed yet: the codes come first.
  const [needVerify, setNeedVerify] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPhoneOk, setSignupPhoneOk] = useState(false);
  // Confirmed by SMS code in the form; the proof goes with the new account.
  const [signupProof, setSignupProof] = useState<PhoneConfirmed | null>(null);
  // Delivery phone: any country; valid unless it was typed and isn't.
  const [deliveryPhoneOk, setDeliveryPhoneOk] = useState(true);
  const [signedInEmail, setSignedInEmail] = useState('');
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    city: '', addressLine1: '', addressLine2: '',
    // A new address's name (Home, Granny's…), saved with it.
    addressLabel: '',
    giftRecipientName: '', giftRecipientEmail: '', giftMessage: '',
    // Empty = the gift starts as soon as payment clears.
    giftSendOn: '',
  });
  // The friend's dog: what their boxes are picked for.
  const [giftDog, setGiftDog] = useState<DogProfile>(emptyDogProfile);
  // The buyer's own phone, prefilled for themselves; not the friend's.
  const [profilePhone, setProfilePhone] = useState('');
  const [giftLater, setGiftLater] = useState(false);
  const [dogId, setDogId] = useState<string | null>(null);
  // A returning customer picks one of their dogs instead of re-entering it;
  // otherwise every purchase (or a reload mid-checkout) created a duplicate.
  const [myDogs, setMyDogs] = useState<any[]>([]);
  // A returning customer picks a saved address instead of typing it again.
  const [savedAddrs, setSavedAddrs] = useState<SavedAddress[]>([]);
  const [addrPicked, setAddrPicked] = useState(false);
  // A new address becomes their main one (the first one always does).
  const [makeMain, setMakeMain] = useState(false);
  // Bumped when a saved address fills the form, so the phone field shows its country.
  const [phoneKey, setPhoneKey] = useState(0);
  const [deliveryMethods, setDeliveryMethods] = useState<Api.DeliveryOption[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState('');
  // No default on purpose: Georgian consumer law voids a term that renews a
  // contract by default without the customer's consent (Art. 22(3)(i)), so
  // renewal must be an active choice, not a pre-ticked box.
  const [autoRenewal, setAutoRenewal] = useState<boolean | null>(null);

  const isGift = !!arrival?.gift;
  const hasSubscription = !!cart?.hasSubscription;
  const steps = ([
    arrival && !arrival.signedIn ? 'account' : null,
    isGift ? 'gift' : hasSubscription ? 'dog' : null,
    'delivery',
  ].filter(Boolean)) as StepKey[];
  const stepIndex = step ? steps.indexOf(step) : 0;
  const stepLabel: Record<StepKey, string> = {
    account: t('co.step.account'), dog: t('co.step.dog'), gift: t('co.step.gift'), delivery: t('co.step.delivery'),
  };

  useEffect(() => {
    setArrival({
      signedIn: !!getToken(),
      gift: new URLSearchParams(window.location.search).get('gift') === 'true',
    });
    prefillFromProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (arrival && ready && !step) setStep(steps[0]);
  }, [arrival, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ads and analytics: checkout started, once per visit to this page.
  const begun = useRef(false);
  useEffect(() => {
    if (begun.current || !cart?.items?.length) return;
    begun.current = true;
    track('InitiateCheckout', { value: Number(cart.total ?? cart.subtotal ?? 0), items: itemsOf(cart.items) });
  }, [cart]);

  // Priced against this cart on the server, so a plan with delivery included
  // shows as free here exactly as it will be charged. The first option is
  // pre-selected: a sensible default beats an error for not choosing.
  // Each option comes with the order's discount and total: a coupon may
  // cover delivery, and a plan bought as a gift is priced as a gift.
  useEffect(() => {
    if (cart?.subtotal === undefined || !arrival) return;
    fetch(`${API_URL}/cart/delivery-methods${arrival.gift ? '?gift=true' : ''}`, { headers: cartHeaders() })
      .then(r => r.json())
      .then((methods: Api.DeliveryOption[]) => {
        setDeliveryMethods(methods);
        setSelectedDelivery(cur => (methods.some(m => m.id === cur) ? cur : methods[0]?.id || ''));
      })
      .catch(() => {});
  }, [cart?.subtotal, cart?.deliveryIncluded, cart?.discountAmount, cart?.coupon?.id, arrival]);

  // Their own default address, ready to go (a gift goes to the friend's, so not there).
  useEffect(() => {
    if (addrPicked || !arrival || arrival.gift || !savedAddrs.length) return;
    const own = savedAddrs.filter(a => !a.isGift);
    const a = own.find(x => x.isDefault) ?? own[0];
    if (a && !form.addressLine1) fillAddress(a);
    setAddrPicked(true);
  }, [savedAddrs, arrival]); // eslint-disable-line react-hooks/exhaustive-deps

  // A signed-in customer shouldn't retype what their profile already holds.
  function prefillFromProfile() {
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(u => {
        if (!u) return;
        setSignedInEmail(u.email || '');
        setProfilePhone(u.phone || '');
        loadMyDogs(token);
        loadAddresses(token);
        setForm(f => ({ ...f, firstName: f.firstName || u.firstName || '', lastName: f.lastName || u.lastName || '', phone: f.phone || u.phone || '' }));
      })
      .catch(() => {});
  }

  function loadMyDogs(token: string) {
    fetch(`${API_URL}/me/dogs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : []))
      .then((dogs: any[]) => {
        if (!Array.isArray(dogs)) return;
        setMyDogs(dogs);
        // One dog is the obvious answer; with several, let them choose.
        if (dogs.length === 1) setDogId(cur => cur ?? dogs[0].id);
      })
      .catch(() => {});
  }

  function loadAddresses(token: string) {
    fetch(`${API_URL}/me/addresses`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : []))
      .then((list: SavedAddress[]) => Array.isArray(list) && setSavedAddrs(list))
      .catch(() => {});
  }

  function fillAddress(a: SavedAddress | null) {
    setForm(f => a
      ? { ...f, firstName: a.firstName, lastName: a.lastName, phone: a.phone, city: a.city, addressLine1: a.addressLine1, addressLine2: a.addressLine2 ?? '' }
      : { ...f, city: '', addressLine1: '', addressLine2: '' });
    setPin(a && a.latitude != null && a.longitude != null ? { lat: a.latitude, lng: a.longitude } : null);
    if (a) { setDeliveryPhoneOk(true); setPhoneKey(k => k + 1); }
    setErrs(e => ({ ...e, firstName: '', lastName: '', phone: '', city: '', addressLine1: '' }));
  }

  function chooseDog(id: string) {
    setDogId(id);
    setErrs(e => ({ ...e, dogName: '' }));
  }

  function update(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrs(e => ({ ...e, [key]: '' }));
  }

  const go = (to: StepKey) => { setError(''); setErrs({}); setStep(to); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const next = () => go(steps[stepIndex + 1]);
  const back = () => go(steps[stepIndex - 1]);

  function fail(e: Record<string, string>) {
    setErrs(e);
    setError('');
    if (countErrors(e)) revealFirstError();
    return countErrors(e) > 0;
  }

  async function submitAccount() {
    const e: Record<string, string> = {};
    if (isNewAccount && !form.firstName.trim()) e.firstName = t('co.e.firstName');
    if (isNewAccount && !form.lastName.trim()) e.lastName = t('co.e.lastName');
    if (!EMAIL_RE.test(form.email.trim())) e.email = t('co.e.email');
    if (!form.password) e.password = t('co.e.passwordReq');
    else if (isNewAccount && form.password.length < 8) e.password = t('co.e.passwordLen');
    if (isNewAccount && !signupPhoneOk) e.signupPhone = t(signupPhone ? 'reg.e.phone' : 'ui.e.phone');
    else if (isNewAccount && !signupProof?.proof) e.signupPhone = t('otp.e.confirm');
    if (fail(e)) return;

    setError(''); setLoading(true);
    try {
      const body = isNewAccount
        ? {
            email: form.email.trim(), password: form.password, firstName: form.firstName.trim(), lastName: form.lastName.trim(),
            phone: signupPhone.trim(), referralCode: storedReferral() || undefined, marketingConsent: consent, language: lang, phoneProof: signupProof?.proof,
          }
        : { email: form.email.trim(), password: form.password };
      const res = await fetch(`${API_URL}${isNewAccount ? '/auth/register' : '/auth/login'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiMessage(data, t('co.e.generic')));
      localStorage.setItem('pupbox_token', data.token);
      // Moves what they added as a guest into the account cart; without this
      // the order would be placed against an empty account cart.
      await refresh();
      prefillFromProfile();
      if (data.verification && !data.verification.verified) setNeedVerify(true);
      else next();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  function submitGift() {
    const e: Record<string, string> = {};
    if (!form.giftRecipientName.trim()) e.giftRecipientName = t('co.e.recipientName');
    if (form.giftRecipientEmail.trim() && !EMAIL_RE.test(form.giftRecipientEmail.trim())) e.giftRecipientEmail = t('co.e.recipientEmail');
    if (!giftDog.name.trim()) e.dogName = t('co.e.dogName');
    if (!giftDog.size) e.dogSize = t('co.e.dogSize');
    if (giftLater && (!form.giftSendOn || form.giftSendOn < todayTbilisi() || form.giftSendOn > inAYear())) e.giftSendOn = t('co.e.giftDate');
    if (fail(e)) return;
    // The delivery step is the friend's address: start it with their name,
    // not the buyer's own details from the profile.
    const [first, ...rest] = form.giftRecipientName.trim().split(/\s+/);
    setForm(f => ({ ...f, firstName: first, lastName: rest.join(' '), phone: f.phone === profilePhone ? '' : f.phone }));
    next();
  }

  // The dog is saved by its own pop-up (the same one as My dogs); here we
  // only need to know which one, so the subscription is for the right dog.
  function submitDog() {
    if (!myDogs.some(d => d.id === dogId)) { setErrs({ dogName: t('co.e.pickDog') }); return; }
    next();
  }

  async function pay() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = t('co.e.firstName');
    if (!form.lastName.trim()) e.lastName = t('co.e.lastName');
    if (!form.phone.trim()) e.phone = t('ui.e.phone');
    else if (!deliveryPhoneOk) e.phone = t('co.e.phone');
    if (!form.city.trim()) e.city = t('co.e.city');
    if (!form.addressLine1.trim()) e.addressLine1 = t('co.e.address');
    if (!selectedDelivery) e.delivery = t('co.e.delivery');
    if (offersRenewal && autoRenewal === null) e.renewal = t('co.e.renewal');
    if (fail(e)) return;

    setError(''); setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/checkout/order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryMethodId: selectedDelivery,
          ...(dogId && !isGift ? { dogId } : {}),
          // Unchanged saved address: use it as it is (else the typed one is saved).
          ...(chosenAddr ? { addressId: chosenAddr.id } : !isGift ? { addressLabel: form.addressLabel.trim() || undefined, makeMainAddress: makeMain } : {}),
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          city: form.city,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2 || undefined,
          ...(pin ? { latitude: pin.lat, longitude: pin.lng } : {}),
          // A gift never auto-renews — the buyer must not be billed
          // indefinitely for someone else's dog.
          autoRenewal: offersRenewal && autoRenewal === true,
          // Ad click and cookie choice: credits the ad that brought them (admin → SEO & tracking).
          tracking: trackingForOrder(),
          ...(isGift ? {
            gift: {
              recipientName: form.giftRecipientName.trim(),
              ...(form.giftRecipientEmail.trim() ? { recipientEmail: form.giftRecipientEmail.trim() } : {}),
              ...(form.giftMessage.trim() ? { message: form.giftMessage.trim() } : {}),
              ...(giftLater && form.giftSendOn ? { deliverOn: form.giftSendOn } : {}),
              dog: toDogPayload(giftDog),
            },
          } : {}),
        }),
      });
      const order = await res.json();
      // Signed in from before verification existed for them: confirm, then come back.
      if (res.status === 403 && order?.code === 'VERIFY_REQUIRED') {
        router.push(`/verify?redirect=${encodeURIComponent(`/checkout${isGift ? '?gift=true' : ''}`)}`);
        return;
      }
      if (!res.ok) throw new Error(apiMessage(order, t('co.e.generic')));
      setOrderPlaced(true);
      await refresh();

      // Straight to the bank: "Pay" should mean pay, not "create an order and
      // then press Pay again". If payment can't start, the order page offers it.
      try {
        const pr = await fetch(`${API_URL}/payments/initiate/${order.id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ saveCard }) });
        const p = pr.ok ? await pr.json() : null;
        if (p?.checkoutUrl) { window.location.href = p.checkoutUrl; return; }
      } catch {}
      router.push(`/checkout/thank-you?order=${order.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  // ── derived ──
  const selectedMethod = deliveryMethods.find(m => m.id === selectedDelivery);
  const deliveryCost = selectedMethod ? Number(selectedMethod.effectivePrice ?? 0) : 0;
  // The server's figures for this option (coupon on delivery, gift pricing); the cart's until they arrive.
  const discount = selectedMethod?.discount ?? cart?.discountAmount ?? 0;
  const total = selectedMethod?.total ?? (cart?.total ?? 0) + deliveryCost;
  // A gift goes to a friend's saved address; anything else to one of their own.
  const addrChoices = savedAddrs.filter(a => a.isGift === isGift);
  const chosenAddr = addrChoices.find(a => sameAddress(a, form, pin)) ?? null;
  const plan = cart?.items?.find((i) => i.subscriptionPlan)?.subscriptionPlan;
  // A plan set in admin not to renew offers no choice: it simply ends.
  const offersRenewal = hasSubscription && !isGift && plan?.autoRenewal !== false;
  const months = Number(plan?.durationValue) || 1;
  const period = months === 1 ? t('co.period.month') : fill(t('co.period.months'), { n: months });

  const field = (key: string) =>
    `w-full rounded-xl px-3.5 py-3 text-[13px] text-gray-900 outline-none transition-colors ${errs[key] ? 'bg-red-50 focus:bg-white focus:ring-2 focus:ring-red-300' : 'bg-gray-100/80 hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-teal-300'}`;
  // Every field is required unless it's one of these.
  const OPTIONAL = new Set<keyof typeof form>(['addressLine2', 'addressLabel', 'giftRecipientEmail', 'giftMessage']);
  // The shared field: label inside, moving up as you type; examples go in the hint.
  const input = (id: keyof typeof form, label: string, opts: { type?: string; placeholder?: string; hint?: string; autoComplete?: string; trailing?: React.ReactNode } = {}) => (
    <TextField id={id} label={label} type={opts.type} value={form[id]} onChange={v => update(id, v)} error={errs[id]}
      hint={opts.hint} required={!OPTIONAL.has(id)} autoComplete={opts.autoComplete} trailing={opts.trailing} />
  );

  const summary = (
    <>
      <ul className="space-y-3 text-[13px] mb-4">
        {cart?.items?.map((item) => (
          <li key={item.id} className="flex justify-between gap-3 text-gray-700">
            <span className="flex-1">
              {itemName(item, lang)}
              {item.quantity > 1 && <span className="text-gray-400"> × {item.quantity}</span>}
              <ChoiceNote choice={item.personalisation} />
            </span>
            <span className="shrink-0 font-semibold">{gel((Number(item.price) * item.quantity).toFixed(2))}</span>
          </li>
        ))}
      </ul>
      <dl className="border-t border-gray-100 pt-3 text-[13px] space-y-1.5">
        <div className="flex justify-between text-gray-500"><dt>{t('co.sum.subtotal')}</dt><dd>{gel(cart?.subtotal)}</dd></div>
        {discount > 0 && <div className="flex justify-between text-teal-700"><dt>{cart?.referral ? t('co.sum.friend') : t('co.sum.discount')}</dt><dd>−{gel(discount)}</dd></div>}
        <div className="flex justify-between text-gray-500">
          <dt>{t('co.sum.delivery')}</dt>
          <dd>{selectedMethod ? (deliveryCost === 0 ? (cart?.deliveryIncluded ? t('co.delivery.included') : t('co.delivery.free')) : gel(deliveryCost)) : cart?.deliveryIncluded ? t('co.delivery.included') : t('co.sum.deliveryLater')}</dd>
        </div>
        <div className="flex justify-between font-extrabold text-gray-900 text-[16px] pt-1.5"><dt>{t('co.sum.total')}</dt><dd>{gel(total.toFixed(2))}</dd></div>
      </dl>
    </>
  );

  // Back to where the customer came from (e.g. Prices), not always the cart.
  const goBack = () => {
    const fromHere = typeof document !== 'undefined' && document.referrer.startsWith(window.location.origin) && !/\/checkout/.test(document.referrer);
    if (fromHere && window.history.length > 1) router.back();
    else router.push(hasSubscription && cart?.itemCount === 1 ? '/prices' : '/cart');
  };
  /** Back one step (small square) + the main action (full width). */
  const actions = (main: React.ReactNode) => (
    <div className="flex items-center gap-2 mt-7">
      {stepIndex > 0 && (
        <button type="button" onClick={back} aria-label={t('co.goBack')} title={t('co.goBack')}
          className="w-12 h-12 shrink-0 rounded-[16px] bg-gray-100 text-gray-700 hover:bg-gray-200/80 flex items-center justify-center transition-colors">
          <Icon name="arrow" className="w-5 h-5 rotate-180" strokeWidth={2.2} />
        </button>
      )}
      {main}
    </div>
  );
  const card = 'bg-white rounded-[24px] ring-1 ring-gray-100 p-5 sm:p-7';

  return { t, lang, cart, ready, refresh, router, arrival, setArrival, step, setStep, orderPlaced, setOrderPlaced, loading, setLoading, saveCard, setSaveCard, pin, setPin, error, setError, errs, setErrs, isNewAccount, setIsNewAccount, needVerify, setNeedVerify, consent, setConsent, showPw, setShowPw, signupPhone, setSignupPhone, signupPhoneOk, setSignupPhoneOk, signupProof, setSignupProof, deliveryPhoneOk, setDeliveryPhoneOk, signedInEmail, setSignedInEmail, form, setForm, giftDog, setGiftDog, profilePhone, setProfilePhone, giftLater, setGiftLater, dogId, setDogId, myDogs, setMyDogs, savedAddrs, setSavedAddrs, addrPicked, setAddrPicked, makeMain, setMakeMain, phoneKey, setPhoneKey, deliveryMethods, setDeliveryMethods, selectedDelivery, setSelectedDelivery, autoRenewal, setAutoRenewal, isGift, hasSubscription, steps, stepIndex, stepLabel, begun, prefillFromProfile, loadMyDogs, loadAddresses, fillAddress, chooseDog, update, go, next, back, fail, submitAccount, submitGift, submitDog, pay, selectedMethod, deliveryCost, discount, total, addrChoices, chosenAddr, plan, offersRenewal, months, period, field, OPTIONAL, input, summary, goBack, actions, card };
}

export type Checkout = ReturnType<typeof useCheckout>;
