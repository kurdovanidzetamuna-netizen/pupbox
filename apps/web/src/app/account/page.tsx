'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';

export default function AccountPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    authFetch('/users/me')
      .then(r => r.json())
      .then(u => {
        setUser(u);
        setForm({ firstName: u.firstName || '', lastName: u.lastName || '', phone: u.phone || '' });
      })
      .catch(e => { if (e instanceof SessionExpiredError) router.replace(loginUrl('/account')); })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = t('co.e.firstName');
    if (!form.lastName.trim()) errs.lastName = t('co.e.lastName');
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await authFetch('/users/me', { method: 'PATCH', body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      setSuccess(t('acc.saved'));
    } catch (err) {
      if (err instanceof SessionExpiredError) return router.replace(loginUrl('/account'));
      setError(t('acc.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem('pupbox_token');
    router.push('/');
  }

  const input = (key: 'firstName' | 'lastName' | 'phone', label: string, required = false) => (
    <div>
      <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500"> *</span>}</label>
      <input id={key} value={form[key]} type={key === 'phone' ? 'tel' : 'text'} aria-invalid={!!fieldErrors[key]}
        onChange={e => { setForm({ ...form, [key]: e.target.value }); setFieldErrors(f => ({ ...f, [key]: '' })); }}
        className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${fieldErrors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
      {fieldErrors[key] && <p className="text-red-500 text-xs mt-1">{fieldErrors[key]}</p>}
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">{t('acc.title')}</h1>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600">{t('acc.signOut')}</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <nav className="space-y-3" aria-label={t('acc.title')}>
              {[
                { href: '/account/orders', icon: '📦', k: 'acc.orders' },
                { href: '/account/subscriptions', icon: '📋', k: 'acc.subscriptions' },
                { href: '/account/referrals', icon: '🎁', k: 'acc.referrals' },
                { href: '/shop', icon: '🛍️', k: 'acc.shop' },
              ].map(l => (
                <Link key={l.href} href={l.href} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-teal-400 hover:shadow-sm transition">
                  <span className="text-xl" aria-hidden="true">{l.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{t(l.k)}</span>
                </Link>
              ))}
            </nav>

            <section className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 mb-5">{t('acc.profile')}</h2>
              {success && <p className="text-teal-700 text-sm mb-4 bg-teal-50 px-3 py-2 rounded-lg" role="status">{success}</p>}
              {error && <p className="text-red-600 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg" role="alert">{error}</p>}
              <form onSubmit={save} className="space-y-4" noValidate>
                <div className="grid grid-cols-2 gap-4">
                  {input('firstName', t('co.f.firstName'), true)}
                  {input('lastName', t('co.f.lastName'), true)}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t('acc.email')}</label>
                  <input id="email" value={user?.email || ''} disabled className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-500" />
                </div>
                {input('phone', t('co.f.phone'))}
                <button type="submit" disabled={saving} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-teal-700 transition disabled:opacity-50">
                  {saving ? t('co.saving') : t('acc.save')}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
