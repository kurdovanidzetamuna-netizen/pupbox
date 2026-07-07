'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('pupbox_token') : null; }

const STEPS = ['Account', 'Dog Profile', 'Delivery', 'Review'];

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [deliveryMethods, setDeliveryMethods] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [autoRenewal, setAutoRenewal] = useState(true);
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    city: '', addressLine1: '', addressLine2: '',
    dogName: '', dogBreed: '', dogSize: '', dogGender: '',
    isNewAccount: true,
  });

  const token = getToken();
  const isLoggedIn = !!token;

  useEffect(() => {
    if (cart?.subtotal !== undefined) {
      fetch(`${API_URL}/cart/delivery-methods?total=${cart.subtotal}`)
        .then(r => r.json()).then(setDeliveryMethods).catch(() => {});
    }
  }, [cart?.subtotal]);

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
        if (!res.ok) throw new Error(data.message);
        localStorage.setItem('pupbox_token', data.token);
      }
      setStep(1);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleDogStep() {
    setError(''); setLoading(true);
    try {
      if (form.dogName && cart?.hasSubscription) {
        const t = localStorage.getItem('pupbox_token');
        await fetch(`${API_URL}/me/dogs`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.dogName, breed: form.dogBreed || undefined, size: form.dogSize || undefined, gender: form.dogGender || undefined }),
        });
      }
      setStep(2);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleDeliveryStep() {
    if (!selectedDelivery) { setError('Please select a delivery method'); return; }
    setStep(3);
    setError('');
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
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          city: form.city,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2 || undefined,
          autoRenewal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await refresh();
      router.push(`/checkout/thank-you?order=${data.id}`);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const selectedMethod = deliveryMethods.find(m => m.id === selectedDelivery);
  const deliveryCost = selectedMethod?.effectivePrice ?? 0;
  const finalTotal = ((cart?.total ?? 0) + deliveryCost).toFixed(2);

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

            {/* Step 1: Dog Profile */}
            {step === 1 && (
              <div className="bg-white rounded-xl border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Dog Profile</h2>
                <p className="text-sm text-gray-500 mb-6">{cart?.hasSubscription ? 'Tell us about your dog so we can personalise the box.' : 'Optional — skip if no subscription.'}</p>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Dog Name {cart?.hasSubscription && <span className="text-teal-600">*</span>}</label>
                    <input value={form.dogName} onChange={e => updateForm('dogName', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="e.g. Buddy" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                      <input value={form.dogBreed} onChange={e => updateForm('dogBreed', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="e.g. Labrador" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                      <select value={form.dogSize} onChange={e => updateForm('dogSize', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                        <option value="">Select size</option>
                        {['EXTRA_SMALL','SMALL','MEDIUM','LARGE','EXTRA_LARGE'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                      </select></div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <div className="flex gap-3">
                      {['MALE','FEMALE'].map(g => (
                        <button key={g} onClick={() => updateForm('dogGender', g)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${form.dogGender === g ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600'}`}>{g === 'MALE' ? '♂ Male' : '♀ Female'}</button>
                      ))}
                    </div>
                  </div>
                </div>
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
                      <input value={form.firstName} onChange={e => updateForm('firstName', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input value={form.lastName} onChange={e => updateForm('lastName', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input value={form.phone} onChange={e => updateForm('phone', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input value={form.city} onChange={e => updateForm('city', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input value={form.addressLine1} onChange={e => updateForm('addressLine1', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="Street, building, apartment" /></div>
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
                        {m.isFree ? (
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
                <h2 className="text-xl font-bold text-gray-900 mb-6">Review Your Order</h2>
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
                {cart?.hasSubscription && (
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
