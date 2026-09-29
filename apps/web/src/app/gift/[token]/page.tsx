'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const DOG_SIZES = ['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];

interface Preview {
  alreadyClaimed: boolean;
  recipientName: string | null;
  message: string | null;
  buyerName: string;
  plan: { name: string; boxCount: number; duration: string; benefits: string[] };
}

/**
 * Claiming a gifted subscription.
 *
 * This is where a gift becomes shippable. Until someone lands here the
 * subscription is paid for but has no dog and no address, so the recipient
 * supplies both — the buyer could not have known them.
 */
export default function ClaimGiftPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params?.token ?? '');

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const [account, setAccount] = useState({ email: '', password: '', firstName: '', lastName: '', isNew: true });
  const [dog, setDog] = useState({ name: '', breed: '', size: '', gender: '', weightKg: '', allergies: '' });
  const [address, setAddress] = useState({ firstName: '', lastName: '', phone: '', city: '', addressLine1: '', addressLine2: '', postalCode: '' });

  useEffect(() => {
    setSignedIn(!!localStorage.getItem('pupbox_token'));
    fetch(`${API_URL}/gifts/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.message || 'This gift link is not valid');
        setPreview(body);
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Prefill the card's addressee so they don't retype it.
  useEffect(() => {
    if (preview?.recipientName && !address.firstName) {
      const [first, ...rest] = preview.recipientName.split(' ');
      setAddress((a) => ({ ...a, firstName: first, lastName: rest.join(' ') }));
      setAccount((a) => ({ ...a, firstName: first, lastName: rest.join(' ') }));
    }
  }, [preview]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ensureSignedIn(): Promise<string> {
    const existing = localStorage.getItem('pupbox_token');
    if (existing) return existing;

    const endpoint = account.isNew ? '/auth/register' : '/auth/login';
    const body = account.isNew
      ? { email: account.email, password: account.password, firstName: account.firstName, lastName: account.lastName }
      : { email: account.email, password: account.password };
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Could not sign you in');
    const t = data.token || data.accessToken;
    if (!t) throw new Error('Could not sign you in');
    localStorage.setItem('pupbox_token', t);
    setSignedIn(true);
    return t;
  }

  async function claim() {
    setError('');
    if (!dog.name.trim()) { setError("Please tell us your dog's name"); return; }
    if (!address.addressLine1.trim() || !address.city.trim() || !address.phone.trim()) { setError('Please complete the delivery address'); return; }

    setSubmitting(true);
    try {
      const t = await ensureSignedIn();
      const res = await fetch(`${API_URL}/gifts/${token}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dog: {
            name: dog.name.trim(),
            breed: dog.breed || undefined,
            size: dog.size || undefined,
            gender: dog.gender || undefined,
            weightKg: dog.weightKg ? Number(dog.weightKg) : undefined,
            allergies: dog.allergies ? dog.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
          },
          address: {
            firstName: address.firstName, lastName: address.lastName, phone: address.phone,
            city: address.city, addressLine1: address.addressLine1,
            addressLine2: address.addressLine2 || undefined, postalCode: address.postalCode || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Could not claim this gift');
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const field = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  if (loading) {
    return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">Loading your gift…</p></main>;
  }

  if (loadError || !preview) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-md">
          <div className="text-4xl mb-3">🔗</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">This gift link isn&apos;t valid</h1>
          <p className="text-sm text-gray-500 mb-6">{loadError || 'We couldn&apos;t find a gift for this link. It may have already been claimed.'}</p>
          <Link href="/" className="inline-block bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700">Go to Pupbox</Link>
        </div>
      </main>
    );
  }

  if (preview.alreadyClaimed || done) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-md">
          <div className="text-5xl mb-3">{done ? '🎉' : '✅'}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{done ? "You're all set!" : 'Already claimed'}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {done
              ? `${dog.name}'s first box is being prepared. We'll email you when it ships.`
              : 'This gift has already been claimed. If that was you, sign in to see your subscription.'}
          </p>
          <button onClick={() => router.push('/account/orders')} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700">
            Go to my account
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* The card itself */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center mb-6">
          <div className="text-5xl mb-3">🎁</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {preview.recipientName ? `${preview.recipientName}, you` : 'You'}&apos;ve been given a Pupbox!
          </h1>
          <p className="text-gray-600">
            <strong>{preview.buyerName}</strong> has given your dog a <strong>{preview.plan.name}</strong> subscription
            {preview.plan.boxCount > 0 && <> — {preview.plan.boxCount} {preview.plan.boxCount === 1 ? 'box' : 'boxes'} over {preview.plan.duration}</>}.
          </p>
          {preview.message && (
            <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
              <p className="text-sm italic text-amber-900">“{preview.message}”</p>
              <p className="text-xs text-amber-700 mt-2">— {preview.buyerName}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Tell us about your dog</h2>
          <p className="text-sm text-gray-500 mb-6">Every box is picked for your dog specifically, so the more we know the better we can tailor it.</p>

          {!signedIn && (
            <div className="mb-6 pb-6 border-b border-gray-100">
              <div className="flex gap-2 mb-4">
                {[{ k: true, l: 'Create account' }, { k: false, l: 'I already have one' }].map((o) => (
                  <button key={String(o.k)} onClick={() => setAccount((a) => ({ ...a, isNew: o.k }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${account.isNew === o.k ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {account.isNew && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>First name</label><input value={account.firstName} onChange={(e) => setAccount((a) => ({ ...a, firstName: e.target.value }))} className={field} /></div>
                    <div><label className={label}>Last name</label><input value={account.lastName} onChange={(e) => setAccount((a) => ({ ...a, lastName: e.target.value }))} className={field} /></div>
                  </div>
                )}
                <div><label className={label}>Email</label><input type="email" value={account.email} onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))} className={field} placeholder="you@example.com" /></div>
                <div><label className={label}>Password</label><input type="password" value={account.password} onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))} className={field} placeholder="••••••••" /></div>
                <p className="text-xs text-gray-400">You need an account to manage the subscription, pause it or update your address.</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div><label className={label}>Dog&apos;s name <span className="text-teal-600">*</span></label>
              <input value={dog.name} onChange={(e) => setDog((d) => ({ ...d, name: e.target.value }))} className={field} placeholder="e.g. Rex" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>Breed</label><input value={dog.breed} onChange={(e) => setDog((d) => ({ ...d, breed: e.target.value }))} className={field} placeholder="e.g. Labrador" /></div>
              <div><label className={label}>Size</label>
                <select value={dog.size} onChange={(e) => setDog((d) => ({ ...d, size: e.target.value }))} className={field}>
                  <option value="">Select size</option>
                  {DOG_SIZES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>Weight (kg)</label><input type="number" min="0" step="0.1" value={dog.weightKg} onChange={(e) => setDog((d) => ({ ...d, weightKg: e.target.value }))} className={field} placeholder="e.g. 18" /></div>
              <div><label className={label}>Gender</label>
                <div className="flex gap-2">
                  {['MALE', 'FEMALE'].map((g) => (
                    <button key={g} onClick={() => setDog((d) => ({ ...d, gender: d.gender === g ? '' : g }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition ${dog.gender === g ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600'}`}>
                      {g === 'MALE' ? '♂ Male' : '♀ Female'}
                    </button>
                  ))}
                </div></div>
            </div>
            <div><label className={label}>Allergies</label>
              <input value={dog.allergies} onChange={(e) => setDog((d) => ({ ...d, allergies: e.target.value }))} className={field} placeholder="e.g. chicken, wheat — comma separated" />
              <p className="text-xs text-gray-400 mt-1">We&apos;ll keep these out of every box.</p></div>
          </div>

          <h2 className="text-lg font-bold text-gray-900 mt-8 mb-1">Where should we send it?</h2>
          <p className="text-sm text-gray-500 mb-4">Your address — the sender didn&apos;t need to know it.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>First name</label><input value={address.firstName} onChange={(e) => setAddress((a) => ({ ...a, firstName: e.target.value }))} className={field} /></div>
              <div><label className={label}>Last name</label><input value={address.lastName} onChange={(e) => setAddress((a) => ({ ...a, lastName: e.target.value }))} className={field} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>Phone <span className="text-teal-600">*</span></label><input value={address.phone} onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))} className={field} placeholder="+995 5xx xxx xxx" /></div>
              <div><label className={label}>City <span className="text-teal-600">*</span></label><input value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} className={field} placeholder="Tbilisi" /></div>
            </div>
            <div><label className={label}>Address <span className="text-teal-600">*</span></label><input value={address.addressLine1} onChange={(e) => setAddress((a) => ({ ...a, addressLine1: e.target.value }))} className={field} placeholder="Street and number" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>Apartment, floor</label><input value={address.addressLine2} onChange={(e) => setAddress((a) => ({ ...a, addressLine2: e.target.value }))} className={field} /></div>
              <div><label className={label}>Postal code</label><input value={address.postalCode} onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))} className={field} /></div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-5">{error}</p>}

          <button onClick={claim} disabled={submitting}
            className="w-full mt-6 bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 disabled:opacity-60">
            {submitting ? 'Claiming…' : '🎁 Claim my gift'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">Nothing to pay — {preview.buyerName} has already covered it.</p>
        </div>
      </div>
    </main>
  );
}
