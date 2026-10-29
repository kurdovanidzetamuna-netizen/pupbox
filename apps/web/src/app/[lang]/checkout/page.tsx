'use client';
import MapPicker, { type Pin } from '@/components/MapPicker';
import { formatDate } from '@/lib/dates';
import { useState, useEffect, useRef } from 'react';
import { track, itemsOf, trackingForOrder } from '@/lib/tracking';
import Link from '@/components/LangLink';
import { useRouter } from 'next/navigation';
import { useCart, cartHeaders } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { gel } from '@/lib/format';
import { itemName } from '@/lib/localize';
import LegalNotice from '@/components/LegalNotice';
import DogProfileForm, { emptyDogProfile, toDogPayload, type DogProfile } from '@/components/DogProfileForm';
import DogChooser from '@/components/DogChooser';
import ChoiceNote from '@/components/ChoiceNote';
import VerifyCodes from '@/components/VerifyCodes';
import PhoneInput from '@/components/ui/PhoneInput';
import PhoneOtpField, { type PhoneConfirmed } from '@/components/PhoneOtpField';
import { storedReferral } from '@/lib/referral';
import { FieldError, FormAlert, countErrors, revealFirstError } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import TextField from '@/components/ui/Field';
import DatePicker from '@/components/ui/DatePicker';
import Button from '@/components/ui/Button';
import Segmented from '@/components/ui/Segmented';
import EmptyState from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/icons';
import { PwEye } from '@/app/[lang]/login/LoginForm';
import { loginUrl } from '@/lib/authFetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('pupbox_token') : null; }
function apiMessage(data: any, fallback: string) {
  return (Array.isArray(data?.message) ? data.message[0] : data?.message) || fallback;
}

type StepKey = 'account' | 'dog' | 'gift' | 'delivery';

type SavedAddress = { id: string; label: string | null; firstName: string; lastName: string; phone: string; city: string; addressLine1: string; addressLine2: string | null; latitude: number | null; longitude: number | null; isDefault: boolean; isGift: boolean };

/** The form (and pin) still say exactly what this saved address says. */
function sameAddress(a: SavedAddress, f: { firstName: string; lastName: string; phone: string; city: string; addressLine1: string; addressLine2: string }, pin: Pin | null) {
  const eq = (x: string | null | undefined, y: string) => (x ?? '').trim() === y.trim();
  return eq(a.firstName, f.firstName) && eq(a.lastName, f.lastName) && eq(a.phone, f.phone) && eq(a.city, f.city)
    && eq(a.addressLine1, f.addressLine1) && eq(a.addressLine2, f.addressLine2)
    && (!pin || (pin.lat === a.latitude && pin.lng === a.longitude));
}

/**
 * Label, control and its message. Defined at module level on purpose: a
 * component declared inside the page is a new type on every render, which
 * remounts the input and drops focus after each keystroke.
 */
function Field({ id, label, hint, error, required, children }: { id: string; label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block px-1 mb-1.5 text-[12.5px] font-semibold text-gray-700">{label}{required && <span className="text-red-400"> *</span>}</label>
      {children}
      {error ? <FieldError message={error} /> : hint ? <p className="mt-1 px-1 text-[11.5px] text-gray-500">{hint}</p> : null}
    </div>
  );
}

/** A choice card (delivery method, renewal): soft, with a tick when chosen. */
function OptionCard({ name, checked, onChange, invalid, children }: { name: string; checked: boolean; onChange: () => void; invalid?: boolean; children: React.ReactNode }) {
  return (
    <label className={`relative flex items-center gap-3 rounded-[18px] px-4 py-3.5 cursor-pointer ring-1 ring-inset transition ${checked ? 'bg-teal-50 ring-teal-400' : invalid ? 'bg-red-50 ring-red-300' : 'bg-gray-100/70 ring-transparent hover:bg-gray-100'}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center transition ${checked ? 'bg-teal-600 text-white' : 'bg-white ring-1 ring-gray-300'}`} aria-hidden="true">
        {checked && <Icon name="check" className="w-3 h-3" strokeWidth={3.2} />}
      </span>
      {children}
    </label>
  );
}

/**
 * Checkout in at most three steps: account (skipped when already signed in),
 * the dog (or the gift recipient; skipped for products-only orders), then
 * delivery and payment on one screen. Asking for less — and nothing twice —
 * is the whole point: every extra step is somewhere a customer can leave.
 */
/** Dates for the gift start picker, in Tbilisi time (UTC+4) to match the server. */
const tbilisiDay = (offsetDays = 0) => new Date(Date.now() + 4 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10);
const todayTbilisi = () => tbilisiDay(0);
const tomorrowTbilisi = () => tbilisiDay(1);
const inAYear = () => tbilisiDay(365);

export default function CheckoutPage() {
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
  const [deliveryMethods, setDeliveryMethods] = useState<any[]>([]);
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
      .then((methods: any[]) => {
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
  const plan = cart?.items?.find((i: any) => i.subscriptionPlan)?.subscriptionPlan;
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

  if (ready && !orderPlaced && !(cart?.itemCount > 0)) {
    return (
      <main className="min-h-[70vh] bg-white flex items-center justify-center px-4">
        <EmptyState art="box" title={t('co.empty.title')} text={t('co.empty.sub')}
          action={{ href: '/prices', label: t('co.empty.plans'), icon: 'box' }} second={{ href: '/shop', label: t('co.empty.shop'), icon: 'bag' }} />
      </main>
    );
  }

  const summary = (
    <>
      <ul className="space-y-3 text-[13px] mb-4">
        {cart?.items?.map((item: any) => (
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
        {discount > 0 && <div className="flex justify-between text-teal-700"><dt>{cart.referral ? t('co.sum.friend') : t('co.sum.discount')}</dt><dd>−{gel(discount)}</dd></div>}
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


  return (
    <main className="min-h-screen bg-pastel-grey">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-14">
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={goBack} aria-label={t('co.goBack')} title={t('co.goBack')}
            className="w-10 h-10 shrink-0 rounded-[14px] bg-white ring-1 ring-gray-200/80 text-gray-700 hover:bg-gray-50 flex items-center justify-center">
            <Icon name="arrow" className="w-[18px] h-[18px] rotate-180" strokeWidth={2.2} />
          </button>
          {/* Steps: a bar per step that fills as you go, the current name beside it */}
          {steps.length > 1 && (
            <ol className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label={t('aria.checkoutSteps')}>
              {steps.map((s, i) => (
                <li key={s} aria-current={i === stepIndex ? 'step' : undefined} className="min-w-0">
                  <span className={`block h-1.5 rounded-full transition-colors ${i <= stepIndex ? 'bg-teal-600' : 'bg-gray-200'}`} />
                  <span className={`mt-1.5 flex items-center gap-1 text-[11.5px] sm:text-[12.5px] truncate ${i === stepIndex ? 'text-gray-900 font-bold' : i < stepIndex ? 'text-teal-700 font-semibold' : 'text-gray-400'}`}>
                    {i < stepIndex && <Icon name="check" className="w-3 h-3 shrink-0" strokeWidth={3} />}{stepLabel[s]}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Phones: the order folds into a bar with the total, above the form */}
        <details className="md:hidden mb-4 bg-white rounded-[20px] ring-1 ring-gray-100 group">
          <summary className="list-none flex items-center justify-between gap-3 px-4 h-12 cursor-pointer">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-800"><Icon name="bag" className="w-4 h-4 text-teal-600" />{t('co.sum.show')}<Icon name="arrow" className="w-3.5 h-3.5 rotate-90 group-open:-rotate-90 transition-transform text-gray-400" /></span>
            <span className="text-[15px] font-extrabold text-gray-900">{gel(total.toFixed(2))}</span>
          </summary>
          <div className="px-4 pb-4">{summary}</div>
        </details>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-start">
          <div className="md:col-span-2">
            {/* ── Account ── */}
            {step === 'account' && needVerify && (
              <section className={card}>
                <Heading kind="form" as="h1" title={t('ver.title')} subtitle={t('ver.sub')} />
                <VerifyCodes onDone={() => { setNeedVerify(false); next(); }} />
              </section>
            )}
            {step === 'account' && !needVerify && (
              <section className={card}>
                <Heading kind="form" as="h1" title={t('co.account.title')} subtitle={t('co.account.sub')} />
                {/* The same switch as the sign-in pop-up */}
                <Segmented className="mb-5" label={t('co.account.title')} value={isNewAccount ? 'new' : 'existing'}
                  onChange={v => { setIsNewAccount(v === 'new'); setErrs({}); setError(''); }}
                  options={[{ value: 'new', label: t('nav.signUp') }, { value: 'existing', label: t('nav.signIn') }]} />
                <form onSubmit={e => { e.preventDefault(); submitAccount(); }} className="space-y-4" noValidate>
                  {isNewAccount && (
                    <div className="grid grid-cols-2 gap-3">
                      {input('firstName', t('co.f.firstName'), { autoComplete: 'given-name' })}
                      {input('lastName', t('co.f.lastName'), { autoComplete: 'family-name' })}
                    </div>
                  )}
                  {input('email', t('co.f.email'), { type: 'email', autoComplete: 'email' })}
                  {isNewAccount && (
                    <div>
                      <PhoneOtpField id="signupPhone" mode="signup" label={t('reg.phone')} value={signupPhone} error={errs.signupPhone}
                        confirmed={!!signupProof && signupProof.phone === signupPhone}
                        onChange={(v, ok) => { setSignupPhone(v); setSignupPhoneOk(ok); setErrs(er => ({ ...er, signupPhone: '' })); }}
                        onConfirmed={(c) => { setSignupProof(c); if (c) setErrs(er => ({ ...er, signupPhone: '' })); }} />
                    </div>
                  )}
                  {input('password', t('co.f.password'), { type: showPw ? 'text' : 'password', hint: isNewAccount ? t('co.f.passwordHint') : undefined, autoComplete: isNewAccount ? 'new-password' : 'current-password',
                    trailing: <PwEye shown={showPw} onToggle={() => setShowPw(v => !v)} /> })}
                  {isNewAccount && (
                    <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-teal-600 w-4 h-4" />
                      <span>{t('reg.consent')}</span>
                    </label>
                  )}
                  <FormAlert message={error} missing={countErrors(errs)} />
                  {isNewAccount && <LegalNotice />}
                  <Button type="submit" size="lg" icon="arrow" disabled={loading} label={loading ? t('co.wait') : t('co.continue').replace(/\s*→\s*$/, '')} className="!mt-6" />
                </form>
              </section>
            )}

            {/* ── Gift recipient ── */}
            {step === 'gift' && (
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
            )}

            {/* ── Dog ── */}
            {step === 'dog' && (
              <section className={card}>
                <Heading kind="form" as="h1" title={t(myDogs.length ? 'co.dog.which' : 'co.dog.title')} subtitle={t('co.dog.sub')} />
                <DogChooser dogs={myDogs} value={dogId} onChange={chooseDog} onDogsChange={setMyDogs} error={errs.dogName}
                  onExpired={() => router.replace(loginUrl('/checkout'))} />
                <FormAlert message={error} className="mt-4" />
                {actions(<Button size="lg" icon="arrow" onClick={submitDog} label={t('co.continue').replace(/\s*→\s*$/, '')} />)}
              </section>
            )}

            {/* ── Delivery & payment ── */}
            {step === 'delivery' && (
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
                            <span className="block font-medium text-gray-900 text-sm">{t(`dm.${m.name}`, m.name)}</span>
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
            )}
          </div>

          {/* ── Summary (computers; phones see it folded at the top) ── */}
          <aside className="hidden md:block bg-white rounded-[24px] ring-1 ring-gray-100 p-5 md:sticky md:top-24" aria-label={t('co.sum.title')}>
            <h2 className="text-[15px] font-extrabold text-gray-900 mb-4">{t('co.sum.title')}</h2>
            {summary}
          </aside>
        </div>
      </div>
    </main>
  );
}
