'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import DogProfileForm, { emptyDogProfile, toDogPayload, type DogProfile } from '@/components/DogProfileForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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
  // `tr`, not `t`: this component already uses `t` for the login token.
  const { t: tr } = useLanguage();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const [account, setAccount] = useState({ email: '', password: '', firstName: '', lastName: '', isNew: true });
  const [dog, setDog] = useState<DogProfile>(emptyDogProfile);
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
    if (!dog.name.trim()) { setError(tr('gc.e.dog')); return; }
    if (!address.addressLine1.trim() || !address.city.trim() || !address.phone.trim()) { setError(tr('gc.e.address')); return; }

    setSubmitting(true);
    try {
      const t = await ensureSignedIn();
      const res = await fetch(`${API_URL}/gifts/${token}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dog: toDogPayload(dog),
          address: {
            firstName: address.firstName, lastName: address.lastName, phone: address.phone,
            city: address.city, addressLine1: address.addressLine1,
            addressLine2: address.addressLine2 || undefined, postalCode: address.postalCode || undefined,
          },
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        // A stored token can be stale — expired, or for an account that no
        // longer exists. Without this the account fields stay hidden and the
        // page just says "Unauthorized" with no way to recover.
        localStorage.removeItem('pupbox_token');
        setSignedIn(false);
        throw new Error(tr('gc.e.expired'));
      }
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
    return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">{tr('gc.loading')}</p></main>;
  }

  if (loadError || !preview) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-md">
          <div className="text-4xl mb-3">🔗</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{tr('gc.invalid')}</h1>
          <p className="text-sm text-gray-500 mb-6">{tr('gc.invalidSub')}</p>
          <Link href="/" className="inline-block bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700">{tr('gc.home')}</Link>
        </div>
      </main>
    );
  }

  if (preview.alreadyClaimed || done) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-md">
          <div className="text-5xl mb-3">{done ? '🎉' : '✅'}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{done ? tr('gc.done') : tr('gc.already')}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {done
              ? fill(tr('gc.doneSub'), { dog: dog.name })
              : tr('gc.alreadySub')}
          </p>
          <button onClick={() => router.push('/account/orders')} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700">
            {tr('gc.toAccount')}
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
            {preview.recipientName ? fill(tr('gc.headingNamed'), { name: preview.recipientName }) : tr('gc.heading')}
          </h1>
          <p className="text-gray-600">
            {fill(tr('gc.from'), { buyer: preview.buyerName, plan: preview.plan.name })}
          </p>
          {preview.message && (
            <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
              <p className="text-sm italic text-amber-900">“{preview.message}”</p>
              <p className="text-xs text-amber-700 mt-2">— {preview.buyerName}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{tr('gc.dogTitle')}</h2>
          <p className="text-sm text-gray-500 mb-6">{tr('gc.dogSub')}</p>

          {!signedIn && (
            <div className="mb-6 pb-6 border-b border-gray-100">
              <div className="flex gap-2 mb-4">
                {[{ k: true, l: tr('gc.newAccount') }, { k: false, l: tr('gc.haveAccount') }].map((o) => (
                  <button key={String(o.k)} onClick={() => setAccount((a) => ({ ...a, isNew: o.k }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${account.isNew === o.k ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {account.isNew && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>{tr('co.f.firstName')}</label><input value={account.firstName} onChange={(e) => setAccount((a) => ({ ...a, firstName: e.target.value }))} className={field} /></div>
                    <div><label className={label}>{tr('co.f.lastName')}</label><input value={account.lastName} onChange={(e) => setAccount((a) => ({ ...a, lastName: e.target.value }))} className={field} /></div>
                  </div>
                )}
                <div><label className={label}>{tr('co.f.email')}</label><input type="email" value={account.email} onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))} className={field} placeholder="you@example.com" /></div>
                <div><label className={label}>{tr('co.f.password')}</label><input type="password" value={account.password} onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))} className={field} placeholder="••••••••" /></div>
                <p className="text-xs text-gray-400">{tr('gc.accountNote')}</p>
              </div>
            </div>
          )}

          <DogProfileForm value={dog} onChange={setDog} />

          <h2 className="text-lg font-bold text-gray-900 mt-8 mb-1">{tr('gc.addressTitle')}</h2>
          <p className="text-sm text-gray-500 mb-4">{tr('gc.addressSub')}</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>{tr('co.f.firstName')}</label><input value={address.firstName} onChange={(e) => setAddress((a) => ({ ...a, firstName: e.target.value }))} className={field} /></div>
              <div><label className={label}>{tr('co.f.lastName')}</label><input value={address.lastName} onChange={(e) => setAddress((a) => ({ ...a, lastName: e.target.value }))} className={field} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>{tr('co.f.phone')} <span className="text-teal-600">*</span></label><input value={address.phone} onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))} className={field} placeholder="+995 5xx xxx xxx" /></div>
              <div><label className={label}>{tr('co.f.city')} <span className="text-teal-600">*</span></label><input value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} className={field} placeholder="Tbilisi" /></div>
            </div>
            <div><label className={label}>{tr('co.f.address')} <span className="text-teal-600">*</span></label><input value={address.addressLine1} onChange={(e) => setAddress((a) => ({ ...a, addressLine1: e.target.value }))} className={field} placeholder="Street and number" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>{tr('co.f.address2')}</label><input value={address.addressLine2} onChange={(e) => setAddress((a) => ({ ...a, addressLine2: e.target.value }))} className={field} /></div>
              <div><label className={label}>{tr('gc.postal')}</label><input value={address.postalCode} onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))} className={field} /></div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-5">{error}</p>}

          <button onClick={claim} disabled={submitting}
            className="w-full mt-6 bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 disabled:opacity-60">
            {submitting ? tr('gc.claiming') : tr('gc.claim')}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">{fill(tr('gc.free'), { buyer: preview.buyerName })}</p>
        </div>
      </div>
    </main>
  );
}
