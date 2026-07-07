'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const token = localStorage.getItem('pupbox_token');
    if (!token) { router.push('/login?redirect=/account'); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(u => {
        setUser(u);
        setForm({ firstName: u.firstName || '', lastName: u.lastName || '', phone: u.phone || '' });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setSaving(true);
    setError('');
    setSuccess('');
    const token = localStorage.getItem('pupbox_token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Update failed');
      setSuccess('Profile updated!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem('pupbox_token');
    router.push('/');
  }

  return (
    <main className="min-h-screen bg-gray-50">

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">My Account</h1>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-red-500">Sign out</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Quick links */}
            <div className="space-y-3">
              {[
                { href: '/account/orders', icon: '📦', label: 'My Orders' },
                { href: '/account/referrals', icon: '🎁', label: 'Referrals & Rewards' },
                { href: '/shop', icon: '🛍️', label: 'Shop' },
                { href: '/account/subscriptions', icon: '📋', label: 'My Subscriptions' },
              ].map(l => (
                <Link key={l.href} href={l.href} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-teal-400 hover:shadow-sm transition">
                  <span className="text-xl">{l.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{l.label}</span>
                </Link>
              ))}
            </div>

            {/* Profile form */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 mb-5">Profile Details</h2>
              {success && <p className="text-green-600 text-sm mb-4 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}
              {error && <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <form onSubmit={save} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First name <span className="text-red-500">*</span></label>
                    <input value={form.firstName} onChange={e => { setForm({ ...form, firstName: e.target.value }); setFieldErrors(f => ({ ...f, firstName: '' })); }} className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${fieldErrors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                    {fieldErrors.firstName && <p className="text-red-500 text-xs mt-1">⚠ {fieldErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last name <span className="text-red-500">*</span></label>
                    <input value={form.lastName} onChange={e => { setForm({ ...form, lastName: e.target.value }); setFieldErrors(f => ({ ...f, lastName: '' })); }} className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${fieldErrors.lastName ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                    {fieldErrors.lastName && <p className="text-red-500 text-xs mt-1">⚠ {fieldErrors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input value={user?.email || ''} disabled className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="+995 599 123 456" />
                </div>
                <button type="submit" disabled={saving} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-teal-700 transition disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
