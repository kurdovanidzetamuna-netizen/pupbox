'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, cartHeaders } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { gel } from '@/lib/format';
import { itemName } from '@/lib/localize';
import LegalNotice from '@/components/LegalNotice';
import DogProfileForm, { emptyDogProfile, toDogPayload, fromDog, type DogProfile } from '@/components/DogProfileForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const PHONE_RE = /^\+?[0-9\s()-]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('pupbox_token') : null; }
function apiMessage(data: any, fallback: string) {
  return (Array.isArray(data?.message) ? data.message[0] : data?.message) || fallback;
}

type StepKey = 'account' | 'dog' | 'gift' | 'delivery';

/**
 * Label, control and its message. Defined at module level on purpose: a
 * component declared inside the page is a new type on every render, which
 * remounts the input and drops focus after each keystroke.
 */
function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error ? <p className="text-red-500 text-xs mt-1">{error}</p> : hint ? <p className="text-xs text-gray-400 mt-1">{hint}</p> : null}
    </div>
  );
}

/**
 * Checkout in at most three steps: account (skipped when already signed in),
 * the dog (or the gift recipient; skipped for products-only orders), then
 * delivery and payment on one screen. Asking for less — and nothing twice —
 * is the whole point: every extra step is somewhere a customer can leave.
 */
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
  const [error, setError] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});

  const [isNewAccount, setIsNewAccount] = useState(true);
  const [signedInEmail, setSignedInEmail] = useState('');
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    city: '', addressLine1: '', addressLine2: '',
    giftRecipientName: '', giftRecipientEmail: '', giftMessage: '',
  });
  const [dog, setDog] = useState<DogProfile>(emptyDogProfile);
  const [dogId, setDogId] = useState<string | null>(null);
  // A returning customer picks one of their dogs instead of re-entering it;
  // otherwise every purchase (or a reload mid-checkout) created a duplicate.
  const [myDogs, setMyDogs] = useState<any[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState('');
  const [autoRenewal, setAutoRenewal] = useState(true);

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

  // Priced against this cart on the server, so a plan with delivery included
  // shows as free here exactly as it will be charged. The first option is
  // pre-selected: a sensible default beats an error for not choosing.
  useEffect(() => {
    if (cart?.subtotal === undefined) return;
    fetch(`${API_URL}/cart/delivery-methods`, { headers: cartHeaders() })
      .then(r => r.json())
      .then((methods: any[]) => {
        setDeliveryMethods(methods);
        setSelectedDelivery(cur => (methods.some(m => m.id === cur) ? cur : methods[0]?.id || ''));
      })
      .catch(() => {});
  }, [cart?.subtotal, cart?.deliveryIncluded]);

  // A signed-in customer shouldn't retype what their profile already holds.
  function prefillFromProfile() {
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(u => {
        if (!u) return;
        setSignedInEmail(u.email || '');
        loadMyDogs(token);
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
        if (dogs.length === 1) {
          setDogId(cur => cur ?? dogs[0].id);
          setDog(cur => (cur.name.trim() ? cur : fromDog(dogs[0])));
        }
      })
      .catch(() => {});
  }

  function chooseDog(d: any | null) {
    setDogId(d ? d.id : null);
    setDog(d ? fromDog(d) : emptyDogProfile);
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
    if (Object.keys(e).length) setError(t('co.e.fix'));
    return Object.keys(e).length > 0;
  }

  async function submitAccount() {
    const e: Record<string, string> = {};
    if (isNewAccount && !form.firstName.trim()) e.firstName = t('co.e.firstName');
    if (isNewAccount && !form.lastName.trim()) e.lastName = t('co.e.lastName');
    if (!EMAIL_RE.test(form.email.trim())) e.email = t('co.e.email');
    if (!form.password) e.password = t('co.e.passwordReq');
    else if (isNewAccount && form.password.length < 8) e.password = t('co.e.passwordLen');
    if (fail(e)) return;

    setError(''); setLoading(true);
    try {
      const body = isNewAccount
        ? { email: form.email.trim(), password: form.password, firstName: form.firstName.trim(), lastName: form.lastName.trim() }
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
      next();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  function submitGift() {
    const e: Record<string, string> = {};
    if (!form.giftRecipientName.trim()) e.giftRecipientName = t('co.e.recipientName');
    if (!EMAIL_RE.test(form.giftRecipientEmail.trim())) e.giftRecipientEmail = t('co.e.recipientEmail');
    if (fail(e)) return;
    next();
  }

  async function submitDog() {
    if (fail(dog.name.trim() ? {} : { dogName: t('co.e.dogName') })) return;
    setError(''); setLoading(true);
    try {
      // Saved once: going Back and Continue again updates the same dog
      // instead of creating a duplicate. Its id goes on the order, so the
      // subscription knows which dog it is for.
      const res = await fetch(dogId ? `${API_URL}/me/dogs/${dogId}` : `${API_URL}/me/dogs`, {
        method: dogId ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(toDogPayload(dog)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiMessage(data, t('co.e.generic')));
      if (data?.id) setDogId(data.id);
      next();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function pay() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = t('co.e.firstName');
    if (!form.lastName.trim()) e.lastName = t('co.e.lastName');
    if (!PHONE_RE.test(form.phone.trim())) e.phone = t('co.e.phone');
    if (!form.city.trim()) e.city = t('co.e.city');
    if (!form.addressLine1.trim()) e.addressLine1 = t('co.e.address');
    if (!selectedDelivery) e.delivery = t('co.e.delivery');
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
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          city: form.city,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2 || undefined,
          // A gift never auto-renews — the buyer must not be billed
          // indefinitely for someone else's dog.
          autoRenewal: isGift ? false : autoRenewal,
          ...(isGift ? {
            gift: {
              recipientName: form.giftRecipientName.trim(),
              recipientEmail: form.giftRecipientEmail.trim(),
              ...(form.giftMessage.trim() ? { message: form.giftMessage.trim() } : {}),
            },
          } : {}),
        }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(apiMessage(order, t('co.e.generic')));
      setOrderPlaced(true);
      await refresh();

      // Straight to the bank: "Pay" should mean pay, not "create an order and
      // then press Pay again". If payment can't start, the order page offers it.
      try {
        const pr = await fetch(`${API_URL}/payments/initiate/${order.id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
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
  const total = (cart?.total ?? 0) + deliveryCost;
  const plan = cart?.items?.find((i: any) => i.subscriptionPlan)?.subscriptionPlan;
  const months = Number(plan?.durationValue) || 1;
  const period = months === 1 ? t('co.period.month') : fill(t('co.period.months'), { n: months });

  const field = (key: string) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${errs[key] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;
  const input = (id: keyof typeof form, label: string, opts: { type?: string; placeholder?: string; hint?: string; autoComplete?: string } = {}) => (
    <Field id={id} label={label} hint={opts.hint} error={errs[id]}>
      <input id={id} type={opts.type || 'text'} value={form[id]} onChange={e => update(id, e.target.value)}
        aria-invalid={!!errs[id]} placeholder={opts.placeholder} autoComplete={opts.autoComplete} className={field(id)} />
    </Field>
  );

  if (ready && !orderPlaced && !(cart?.itemCount > 0)) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-md">
          <div className="text-5xl mb-4">🛒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('co.empty.title')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('co.empty.sub')}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/prices" className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-teal-700">{t('co.empty.plans')}</Link>
            <Link href="/shop" className="border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50">{t('co.empty.shop')}</Link>
          </div>
        </div>
      </main>
    );
  }

  const primary = 'w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold hover:bg-teal-700 transition disabled:opacity-60';
  const secondary = 'border border-gray-200 text-gray-600 px-5 py-3.5 rounded-xl font-medium hover:bg-gray-50';

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <Link href="/cart" className="text-sm text-gray-500 hover:text-teal-600">{t('co.backToCart')}</Link>
        </div>

        {/* Steps */}
        {steps.length > 1 && (
          <ol className="flex items-center justify-center gap-2 mb-8 text-sm" aria-label="Checkout steps">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-2" aria-current={i === stepIndex ? 'step' : undefined}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < stepIndex ? 'bg-teal-600 text-white' : i === stepIndex ? 'bg-teal-600 text-white ring-4 ring-teal-100' : 'bg-gray-200 text-gray-500'}`}>
                  {i < stepIndex ? '✓' : i + 1}
                </span>
                <span className={`hidden sm:inline ${i === stepIndex ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>{stepLabel[s]}</span>
                {i < steps.length - 1 && <span className="w-6 sm:w-10 h-px bg-gray-200" aria-hidden="true" />}
              </li>
            ))}
          </ol>
        )}

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <div className="md:col-span-2">
            {/* ── Account ── */}
            {step === 'account' && (
              <section className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
                <h1 className="text-xl font-bold text-gray-900 mb-1">{t('co.account.title')}</h1>
                <p className="text-sm text-gray-500 mb-6">{t('co.account.sub')}</p>
                <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-100 p-1 rounded-xl" role="tablist">
                  {[{ v: true, k: 'co.account.new' }, { v: false, k: 'co.account.existing' }].map(o => (
                    <button key={String(o.v)} type="button" role="tab" aria-selected={isNewAccount === o.v}
                      onClick={() => { setIsNewAccount(o.v); setErrs({}); setError(''); }}
                      className={`py-2 rounded-lg text-sm font-semibold transition ${isNewAccount === o.v ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}>
                      {t(o.k)}
                    </button>
                  ))}
                </div>
                <form onSubmit={e => { e.preventDefault(); submitAccount(); }} className="space-y-4" noValidate>
                  {isNewAccount && (
                    <div className="grid grid-cols-2 gap-4">
                      {input('firstName', t('co.f.firstName'), { autoComplete: 'given-name' })}
                      {input('lastName', t('co.f.lastName'), { autoComplete: 'family-name' })}
                    </div>
                  )}
                  {input('email', t('co.f.email'), { type: 'email', placeholder: 'you@example.com', autoComplete: 'email' })}
                  {input('password', t('co.f.password'), { type: 'password', hint: isNewAccount ? t('co.f.passwordHint') : undefined, autoComplete: isNewAccount ? 'new-password' : 'current-password' })}
                  {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
                  {isNewAccount && <LegalNotice />}
                  <button type="submit" disabled={loading} className={primary}>{loading ? t('co.wait') : t('co.continue')}</button>
                </form>
              </section>
            )}

            {/* ── Gift recipient ── */}
            {step === 'gift' && (
              <section className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
                <h1 className="text-xl font-bold text-gray-900 mb-1">{t('co.gift.title')}</h1>
                <p className="text-sm text-gray-500 mb-6">{t('co.gift.sub')}</p>
                <div className="space-y-4">
                  {input('giftRecipientName', t('co.gift.name'), { placeholder: 'Nino Beridze' })}
                  {input('giftRecipientEmail', t('co.gift.email'), { type: 'email', placeholder: 'nino@example.com', hint: t('co.gift.emailHint') })}
                  <Field id="giftMessage" label={t('co.gift.message')} hint={`${form.giftMessage.length}/1000`} error={errs.giftMessage}>
                    <textarea id="giftMessage" value={form.giftMessage} onChange={e => update('giftMessage', e.target.value)} rows={3} maxLength={1000}
                      placeholder={t('co.gift.messagePh')} className={`${field('giftMessage')} resize-y`} />
                  </Field>
                </div>
                <p className="mt-5 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">{t('co.gift.note')}</p>
                {error && <p className="text-red-500 text-sm mt-4" role="alert">{error}</p>}
                <div className="flex gap-3 mt-6">
                  {stepIndex > 0 && <button type="button" onClick={back} className={secondary}>{t('co.back')}</button>}
                  <button type="button" onClick={submitGift} className={primary}>{t('co.continue')}</button>
                </div>
              </section>
            )}

            {/* ── Dog ── */}
            {step === 'dog' && (
              <section className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
                <h1 className="text-xl font-bold text-gray-900 mb-1">{t('co.dog.title')}</h1>
                <p className="text-sm text-gray-500 mb-6">{t('co.dog.sub')}</p>
                {myDogs.length > 0 && (
                  <div className="mb-7">
                    <p className="text-sm font-semibold text-gray-900 mb-2.5">{t('co.dog.which')}</p>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('co.dog.which')}>
                      {myDogs.map(d => (
                        <button key={d.id} type="button" role="radio" aria-checked={dogId === d.id} onClick={() => chooseDog(d)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${dogId === d.id ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          🐶 {d.name}
                        </button>
                      ))}
                      <button type="button" role="radio" aria-checked={!dogId} onClick={() => chooseDog(null)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${!dogId ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {t('co.dog.another')}
                      </button>
                    </div>
                  </div>
                )}
                <DogProfileForm value={dog} onChange={d => { setDog(d); setErrs(e => ({ ...e, dogName: '' })); }} compact nameError={errs.dogName} />
                {error && <p className="text-red-500 text-sm mt-4" role="alert">{error}</p>}
                <div className="flex gap-3 mt-8">
                  {stepIndex > 0 && <button type="button" onClick={back} className={secondary}>{t('co.back')}</button>}
                  <button type="button" onClick={submitDog} disabled={loading} className={primary}>{loading ? t('co.saving') : t('co.continue')}</button>
                </div>
              </section>
            )}

            {/* ── Delivery & payment ── */}
            {step === 'delivery' && (
              <section className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
                {isGift && (
                  <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-amber-900">{fill(t('co.gift.for'), { name: form.giftRecipientName })}</p>
                    <p className="text-xs text-amber-800">{form.giftRecipientEmail}</p>
                    {form.giftMessage && <p className="text-xs italic text-amber-800 mt-2">“{form.giftMessage}”</p>}
                    <p className="text-xs text-amber-700 mt-2 pt-2 border-t border-amber-200">{fill(t('co.gift.billingNote'), { name: form.giftRecipientName })}</p>
                  </div>
                )}
                <h1 className="text-xl font-bold text-gray-900 mb-1">{isGift ? t('co.delivery.giftTitle') : t('co.delivery.title')}</h1>
                {signedInEmail && <p className="text-xs text-gray-400 mb-5">{fill(t('co.signedInAs'), { email: signedInEmail })}</p>}
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {input('firstName', t('co.f.firstName'), { autoComplete: 'given-name' })}
                    {input('lastName', t('co.f.lastName'), { autoComplete: 'family-name' })}
                  </div>
                  {input('phone', t('co.f.phone'), { type: 'tel', placeholder: '+995 599 123 456', autoComplete: 'tel' })}
                  {input('city', t('co.f.city'), { placeholder: 'თბილისი', autoComplete: 'address-level2' })}
                  {input('addressLine1', t('co.f.address'), { placeholder: t('co.f.addressPh'), autoComplete: 'address-line1' })}
                  {input('addressLine2', t('co.f.address2'), { autoComplete: 'address-line2' })}
                </div>

                <h2 className="font-semibold text-gray-900 mt-8 mb-3">{t('co.delivery.method')}</h2>
                <div className="space-y-3" role="radiogroup" aria-label={t('co.delivery.method')}>
                  {deliveryMethods.map(m => {
                    const days = String(m.estimatedDays ?? '');
                    return (
                      <label key={m.id} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${selectedDelivery === m.id ? 'border-teal-600 bg-teal-50' : 'border-gray-100 hover:border-gray-200'}`}>
                        <span className="flex items-center gap-3">
                          <input type="radio" name="delivery" value={m.id} checked={selectedDelivery === m.id}
                            onChange={() => { setSelectedDelivery(m.id); setErrs(e => ({ ...e, delivery: '' })); }} className="accent-teal-600" />
                          <span>
                            <span className="block font-medium text-gray-900 text-sm">{t(`dm.${m.name}`, m.name)}</span>
                            {days && <span className="block text-xs text-gray-400">{days === '1' ? t('co.delivery.day') : fill(t('co.delivery.days'), { n: days })}</span>}
                          </span>
                        </span>
                        <span className="text-right">
                          {m.includedWithPlan
                            ? <span className="text-teal-700 font-semibold text-sm">{t('co.delivery.included')}</span>
                            : m.isFree
                              ? <span className="text-teal-700 font-semibold text-sm">{t('co.delivery.free')}</span>
                              : <span className="font-bold text-sm">{gel(m.price)}</span>}
                          {m.freeThreshold && !m.isFree && (
                            <span className="block text-xs text-gray-400">{fill(t('co.delivery.freeOver'), { amount: gel(m.freeThreshold) })}</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {errs.delivery && <p className="text-red-500 text-xs mt-2">{errs.delivery}</p>}

                {/* Renewal is spelled out — price and period — not just a tick. */}
                {hasSubscription && !isGift && (
                  <label className={`mt-6 flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition ${autoRenewal ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-gray-50'}`}>
                    <input type="checkbox" checked={autoRenewal} onChange={e => setAutoRenewal(e.target.checked)} className="mt-0.5 w-5 h-5 accent-teal-600 shrink-0" />
                    <span>
                      <span className="block font-semibold text-gray-900 text-sm">🔄 {t('co.renew.title')}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {autoRenewal ? fill(t('co.renew.on'), { period, price: gel(plan?.price) }) : t('co.renew.off')}
                      </span>
                    </span>
                  </label>
                )}

                {error && <p className="text-red-500 text-sm mt-5" role="alert">{error}</p>}
                <div className="flex gap-3 mt-6">
                  {stepIndex > 0 && <button type="button" onClick={back} className={secondary}>{t('co.back')}</button>}
                  <button type="button" onClick={pay} disabled={loading} className={primary}>
                    {loading ? t('co.placing') : fill(t('co.pay'), { price: gel(total.toFixed(2)) })}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">
                  {t('co.terms')} <Link href="/pages/terms" className="underline hover:text-teal-600">{t('co.termsLink')}</Link>.
                </p>
              </section>
            )}
          </div>

          {/* ── Summary ── */}
          <aside className="bg-white rounded-2xl border border-gray-100 p-5 h-fit md:sticky md:top-24" aria-label={t('co.sum.title')}>
            <h2 className="font-semibold text-gray-900 mb-4">{t('co.sum.title')}</h2>
            <ul className="space-y-3 text-sm mb-4">
              {cart?.items?.map((item: any) => (
                <li key={item.id} className="flex justify-between gap-3 text-gray-700">
                  <span className="flex-1">
                    {itemName(item, lang)}
                    {item.quantity > 1 && <span className="text-gray-400"> × {item.quantity}</span>}
                  </span>
                  <span className="shrink-0 font-medium">{gel((Number(item.price) * item.quantity).toFixed(2))}</span>
                </li>
              ))}
            </ul>
            <dl className="border-t border-gray-100 pt-3 text-sm space-y-1.5">
              <div className="flex justify-between text-gray-500"><dt>{t('co.sum.subtotal')}</dt><dd>{gel(cart?.subtotal)}</dd></div>
              {cart?.discountAmount > 0 && <div className="flex justify-between text-teal-700"><dt>{t('co.sum.discount')}</dt><dd>−{gel(cart.discountAmount)}</dd></div>}
              <div className="flex justify-between text-gray-500">
                <dt>{t('co.sum.delivery')}</dt>
                <dd>{cart?.deliveryIncluded ? t('co.delivery.included') : selectedMethod ? (deliveryCost === 0 ? t('co.delivery.free') : gel(deliveryCost)) : t('co.sum.deliveryLater')}</dd>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5"><dt>{t('co.sum.total')}</dt><dd>{gel(total.toFixed(2))}</dd></div>
            </dl>
          </aside>
        </div>
      </div>
    </main>
  );
}
