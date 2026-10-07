'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, cartHeaders } from '@/context/CartContext';
import DogProfileForm, { emptyDogProfile, toDogPayload, type DogProfile } from '@/components/DogProfileForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('pupbox_token') : null; }

export default function CheckoutPage() {
  const { cart, ready, refresh } = useCart();
  // Set once the order exists, so emptying the cart on the way to payment
  // doesn't flash the empty-cart screen.
  const [orderPlaced, setOrderPlaced] = useState(false);
  const router = useRouter();
  const [step, setStep] = useState(0);
  // Arrives as /checkout?gift=true from the "Gift This Plan" buttons. Read in
  // an effect, not during render, so the server and client agree on first paint.
  const [isGift, setIsGift] = useState(false);
  useEffect(() => {
    setIsGift(new URLSearchParams(window.location.search).get('gift') === 'true');
  }, []);

  // Gifting replaces the dog step: the recipient's dog is not ours to describe,
  // so they supply it later from the claim link.
  const STEPS = isGift
    ? ['Account', 'Gift Details', 'Delivery', 'Review']
    : ['Account', 'Dog Profile', 'Delivery', 'Review'];
  const [deliveryMethods, setDeliveryMethods] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [autoRenewal, setAutoRenewal] = useState(true);
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    city: '', addressLine1: '', addressLine2: '',
    giftRecipientName: '', giftRecipientEmail: '', giftMessage: '',
    isNewAccount: true,
  });
  const [dog, setDog] = useState<DogProfile>(emptyDogProfile);
  const [dogId, setDogId] = useState<string | null>(null);
  const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});

  const token = getToken();
  const isLoggedIn = !!token;

  // Priced against this cart on the server, so a plan with delivery included
  // shows as free here exactly as it will be charged.
  useEffect(() => {
    if (cart?.subtotal !== undefined) {
      fetch(`${API_URL}/cart/delivery-methods`, { headers: cartHeaders() })
        .then(r => r.json()).then(setDeliveryMethods).catch(() => {});
    }
  }, [cart?.subtotal, cart?.deliveryIncluded]);

  // A signed-in customer shouldn't retype what their profile already holds.
  // Runs on arrival and again right after signing in at the account step.
  function prefillFromProfile() {
    const t = getToken();
    if (!t) return;
    fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(u => {
        if (!u) return;
        setForm(f => ({ ...f, firstName: f.firstName || u.firstName || '', lastName: f.lastName || u.lastName || '', phone: f.phone || u.phone || '' }));
      })
      .catch(() => {});
  }
  useEffect(prefillFromProfile, []);

  function updateForm(key: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleAuthStep() {
    setError(''); setLoading(true);
    try {
      if (!isLoggedIn) {
        const endpoint = form.isNewAccount ? '/auth/register' : '/auth/login';
        const body = form.isNewAccount
          ? { email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName, phone: form.phone }
          : { email: form.email, password: form.password };
        const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message);
        localStorage.setItem('pupbox_token', data.token);
        // Moves what they added as a guest into the account cart; without
        // this the order would be placed against an empty account cart.
        await refresh();
        prefillFromProfile();
      }
      setStep(1);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function handleGiftStep() {
    setError('');
    if (!form.giftRecipientName.trim()) { setError('Who is this gift for?'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.giftRecipientEmail.trim())) { setError('Enter a valid email so we can send the gift card'); return; }
    setStep(2);
  }

  async function handleDogStep() {
    setError('');
    if (cart?.hasSubscription && !dog.name.trim()) { setError("Please tell us your dog's name") ; return; }
    setLoading(true);
    try {
      if (dog.name.trim() && cart?.hasSubscription) {
        const t = localStorage.getItem('pupbox_token');
        // Sends the full profile — allergies and preferences included — rather
        // than just name/breed/size/gender as before, so the personalisation
        // fields the schema has always had actually get populated.
        // Saved once: going Back and Continue again updates the same dog
        // instead of creating a duplicate.
        const res = await fetch(dogId ? `${API_URL}/me/dogs/${dogId}` : `${API_URL}/me/dogs`, {
          method: dogId ? 'PUT' : 'POST',
          headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(toDogPayload(dog)),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(Array.isArray(body.message) ? body.message[0] : body.message || 'Could not save your dog');
        }
        const saved = await res.json().catch(() => null);
        if (saved?.id) setDogId(saved.id);
      }
      setStep(2);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function validateAddress() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!/^\+?[0-9\s()-]{7,20}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number, e.g. +995 599 123 456';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.addressLine1.trim()) e.addressLine1 = 'Address is required';
    setAddrErrors(e);
    return e;
  }

  async function handleDeliveryStep() {
    setError('');
    const e = validateAddress();
    if (Object.keys(e).length) { setError('Please complete the delivery details'); return; }
    if (!selectedDelivery) { setError('Please select a delivery method'); return; }
    setStep(3);
  }

  async function placeOrder() {
    setError(''); setLoading(true);
    try {
      const t = localStorage.getItem('pupbox_token');
      const res = await fetch(`${API_URL}/checkout/order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
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
      const data = await res.json();
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message);
      setOrderPlaced(true);
      await refresh();
      router.push(`/checkout/thank-you?order=${data.id}`);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const selectedMethod = deliveryMethods.find(m => m.id === selectedDelivery);
  const deliveryCost = selectedMethod?.effectivePrice ?? 0;
  const finalTotal = ((cart?.total ?? 0) + deliveryCost).toFixed(2);

  if (ready && !orderPlaced && !(cart?.itemCount > 0)) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-md">
          <div className="text-5xl mb-4">🛒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-sm text-gray-500 mb-6">Choose a plan or add a product, then come back to check out.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/prices" className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-teal-700">View plans</Link>
            <Link href="/shop" className="border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50">Shop</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-teal-600">🐾 Pupbox</Link>
        <Link href="/cart" className="text-sm text-gray-600 hover:text-teal-600">← Back to cart</Link>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-sm ${i === step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            {/* Step 0: Account */}
            {step === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Your Account</h2>
                {isLoggedIn ? (
                  <div className="bg-green-50 rounded-lg p-4 mb-4">
                    <p className="text-green-700 font-medium text-sm">✓ You are signed in</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-4 mb-6">
                      <button onClick={() => updateForm('isNewAccount', true)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${form.isNewAccount ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-gray-200 text-gray-600'}`}>Create Account</button>
                      <button onClick={() => updateForm('isNewAccount', false)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${!form.isNewAccount ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-gray-200 text-gray-600'}`}>Sign In</button>
                    </div>
                    <div className="space-y-4">
                      {form.isNewAccount && (
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input value={form.firstName} onChange={e => updateForm('firstName', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
                          <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input value={form.lastName} onChange={e => updateForm('lastName', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
                        </div>
                      )}
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" value={form.password} onChange={e => updateForm('password', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
                      {form.isNewAccount && (
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input value={form.phone} onChange={e => updateForm('phone', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
                      )}
                    </div>
                  </>
                )}
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                <button onClick={isLoggedIn ? () => setStep(1) : handleAuthStep} disabled={loading} className="mt-6 w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition disabled:opacity-60">
                  {loading ? 'Please wait...' : 'Continue →'}
                </button>
              </div>
            )}

            {/* Step 1 (gifting): who it's for. We deliberately don't ask about
                their dog — the buyer rarely knows its size or allergies, and the
                recipient supplies all of that from the claim link. */}
            {step === 1 && isGift && (
              <div className="bg-white rounded-xl border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-2">🎁 Gift Details</h2>
                <p className="text-sm text-gray-500 mb-6">
                  We&apos;ll email them a gift card with your message. They&apos;ll add their dog&apos;s details
                  and delivery address themselves, so you don&apos;t need to know them.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient&apos;s name <span className="text-teal-600">*</span></label>
                    <input value={form.giftRecipientName} onChange={e => updateForm('giftRecipientName', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="e.g. Nino Beridze" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient&apos;s email <span className="text-teal-600">*</span></label>
                    <input type="email" value={form.giftRecipientEmail} onChange={e => updateForm('giftRecipientEmail', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="nino@example.com" />
                    <p className="text-xs text-gray-400 mt-1">The gift card goes here once your payment clears.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Personal message</label>
                    <textarea value={form.giftMessage} onChange={e => updateForm('giftMessage', e.target.value)} rows={3} maxLength={1000} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y" placeholder="Happy birthday! Hope Rex enjoys these treats 🐾" />
                    <p className="text-xs text-gray-400 mt-1">{form.giftMessage.length}/1000 — optional, shown on the gift card</p>
                  </div>
                </div>
                <div className="mt-5 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    The first box ships once they&apos;ve claimed the gift and told us about their dog.
                    Gift subscriptions never auto-renew, so you won&apos;t be charged again.
                  </p>
                </div>
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(0)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">← Back</button>
                  <button onClick={handleGiftStep} className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700">Continue →</button>
                </div>
              </div>
            )}

            {/* Step 1: Dog Profile */}
            {step === 1 && !isGift && (
              <div className="bg-white rounded-xl border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Tell us about your dog</h2>
                <p className="text-sm text-gray-500 mb-6">
                  {cart?.hasSubscription
                    ? 'Every box is picked for your dog specifically — the more we know, the better we can tailor it.'
                    : 'Optional — skip if you are not subscribing.'}
                </p>
                <DogProfileForm value={dog} onChange={setDog} />
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(0)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">← Back</button>
                  <button onClick={handleDogStep} disabled={loading} className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 disabled:opacity-60">
                    {loading ? 'Saving...' : 'Continue →'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Delivery */}
            {step === 2 && (
              <div className="bg-white rounded-xl border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Delivery Details</h2>
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input value={form.firstName} onChange={e => { updateForm('firstName', e.target.value); setAddrErrors(x => ({ ...x, firstName: '' })); }} aria-invalid={!!addrErrors.firstName} className={`w-full border  rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${addrErrors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                      {addrErrors.firstName && <p className="text-red-500 text-xs mt-1">{addrErrors.firstName}</p>}</div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input value={form.lastName} onChange={e => { updateForm('lastName', e.target.value); setAddrErrors(x => ({ ...x, lastName: '' })); }} aria-invalid={!!addrErrors.lastName} className={`w-full border  rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${addrErrors.lastName ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                      {addrErrors.lastName && <p className="text-red-500 text-xs mt-1">{addrErrors.lastName}</p>}</div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input value={form.phone} onChange={e => { updateForm('phone', e.target.value); setAddrErrors(x => ({ ...x, phone: '' })); }} aria-invalid={!!addrErrors.phone} className={`w-full border  rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${addrErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                      {addrErrors.phone && <p className="text-red-500 text-xs mt-1">{addrErrors.phone}</p>}</div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input value={form.city} onChange={e => { updateForm('city', e.target.value); setAddrErrors(x => ({ ...x, city: '' })); }} aria-invalid={!!addrErrors.city} className={`w-full border  rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${addrErrors.city ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                      {addrErrors.city && <p className="text-red-500 text-xs mt-1">{addrErrors.city}</p>}</div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input value={form.addressLine1} onChange={e => { updateForm('addressLine1', e.target.value); setAddrErrors(x => ({ ...x, addressLine1: '' })); }} aria-invalid={!!addrErrors.addressLine1} className={`w-full border  rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${addrErrors.addressLine1 ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} placeholder="Street, building, apartment" />
                      {addrErrors.addressLine1 && <p className="text-red-500 text-xs mt-1">{addrErrors.addressLine1}</p>}</div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 (optional)</label>
                    <input value={form.addressLine2} onChange={e => updateForm('addressLine2', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-3">Delivery Method</h3>
                <div className="space-y-3 mb-6">
                  {deliveryMethods.map(m => (
                    <label key={m.id} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${selectedDelivery === m.id ? 'border-teal-600 bg-teal-50' : 'border-gray-100 hover:border-gray-200'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="delivery" value={m.id} checked={selectedDelivery === m.id} onChange={() => setSelectedDelivery(m.id)} className="text-teal-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{m.name}</p>
                          <p className="text-xs text-gray-400">{m.description} · {m.estimatedDays} day{m.estimatedDays !== '1' ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {m.includedWithPlan ? (
                          <span className="text-green-600 font-bold text-sm">Included with your plan</span>
                        ) : m.isFree ? (
                          <span className="text-green-600 font-bold text-sm">FREE</span>
                        ) : (
                          <span className="font-bold text-sm">₾{Number(m.price).toFixed(2)}</span>
                        )}
                        {m.freeThreshold && !m.isFree && (
                          <p className="text-xs text-gray-400">Free over ₾{Number(m.freeThreshold).toFixed(0)}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">← Back</button>
                  <button onClick={handleDeliveryStep} className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700">Continue →</button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="bg-white rounded-xl border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">{isGift ? 'Review Your Gift' : 'Review Your Order'}</h2>
                {isGift && (
                  <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-amber-900 mb-1">🎁 Gift for {form.giftRecipientName}</p>
                    <p className="text-xs text-amber-800">{form.giftRecipientEmail}</p>
                    {form.giftMessage && <p className="text-xs italic text-amber-800 mt-2">“{form.giftMessage}”</p>}
                    <p className="text-xs text-amber-700 mt-2 pt-2 border-t border-amber-200">
                      Delivery details below are yours, for billing. The box ships to the address {form.giftRecipientName || 'they'} provide{form.giftRecipientName ? 's' : ''} when claiming.
                    </p>
                  </div>
                )}
                <div className="space-y-4 mb-6">
                  {cart?.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-600">
                      <span>{item.product?.name || item.subscriptionPlan?.name} × {item.quantity}</span>
                      <span className="font-medium">₾{(Number(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₾{cart?.subtotal?.toFixed(2)}</span></div>
                    {cart?.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−₾{cart?.discountAmount?.toFixed(2)}</span></div>}
                    <div className="flex justify-between text-gray-500"><span>Delivery ({selectedMethod?.name})</span><span>{deliveryCost === 0 ? 'FREE' : `₾${deliveryCost.toFixed(2)}`}</span></div>
                    <div className="flex justify-between font-bold text-gray-900 text-base pt-1"><span>Total</span><span>₾{finalTotal}</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 mb-6">
                  <p className="font-medium text-gray-900 mb-1">Delivery to:</p>
                  <p>{form.firstName} {form.lastName} · {form.phone}</p>
                  <p>{form.addressLine1}{form.addressLine2 ? ', ' + form.addressLine2 : ''}, {form.city}</p>
                </div>
                {/* Not offered for a gift: it is forced off server-side, so a
                    toggle here would imply a choice the buyer does not have. */}
                {cart?.hasSubscription && !isGift && (
                  <div className={`rounded-xl border-2 p-4 mb-5 cursor-pointer transition ${autoRenewal ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-gray-50'}`}
                    onClick={() => setAutoRenewal(v => !v)}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition ${autoRenewal ? 'bg-teal-600' : 'border-2 border-gray-300 bg-white'}`}>
                        {autoRenewal && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">🔄 Enable Auto-Renewal</p>
                        <p className="text-xs text-gray-500 mt-0.5">Your subscription renews automatically and the next box ships without any action from you. You can cancel anytime from your account.</p>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 mb-4 text-center">By placing this order you agree to our Terms and Conditions.</p>
                {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">← Back</button>
                  <button onClick={placeOrder} disabled={loading} className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 disabled:opacity-60">
                    {loading ? 'Placing order...' : `Pay ₾${finalTotal} →`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart summary sidebar */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 h-fit sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">Order ({cart?.itemCount ?? 0} items)</h3>
            <div className="space-y-3 text-sm mb-4">
              {cart?.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-gray-600">
                  <span className="line-clamp-1 flex-1 mr-2">{item.product?.name || item.subscriptionPlan?.name}</span>
                  <span className="shrink-0">₾{(Number(item.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 text-sm space-y-1">
              {cart?.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−₾{cart?.discountAmount?.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-gray-900"><span>Total</span><span>₾{finalTotal}</span></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
