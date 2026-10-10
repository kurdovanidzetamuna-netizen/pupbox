'use client';
import { signOut } from '@/lib/signOut';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import AccountSecurity from '@/components/AccountSecurity';

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
      const u = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((Array.isArray(u.message) ? u.message[0] : u.message) || t('acc.saveFailed'));
      setUser(u);
      setForm(f => ({ ...f, phone: u.phone || '' }));
      // A new number has to be confirmed with an SMS code.
      if (!u.phoneVerified) {
        await authFetch('/auth/verify/send', { method: 'POST', body: JSON.stringify({ channel: 'PHONE' }) }).catch(() => {});
        return router.push('/verify?redirect=/account');
      }
      setSuccess(t('acc.saved'));
    } catch (err: any) {
      if (err instanceof SessionExpiredError) return router.replace(loginUrl('/account'));
      setError(err?.message || t('acc.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    signOut();
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

  async function toggleConsent() {
    const next = !user?.marketingConsent;
    try {
      const res = await authFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ marketingConsent: next }) });
      if (!res.ok) throw new Error();
      setUser(await res.json());
      setSuccess(t(next ? 'acc.consentOn' : 'acc.consentOff'));
    } catch (err) {
      if (err instanceof SessionExpiredError) return router.replace(loginUrl('/account'));
      setError(t('acc.saveFailed'));
    }
  }

  const unverified = user && (!user.emailVerified || !user.phoneVerified);

  return (
    <main className="min-h-screen bg-cream">
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
                { href: '/prices', icon: '🐾', k: 'acc.subscribe' },
                { href: '/account/orders', icon: '📦', k: 'acc.orders' },
                { href: '/account/subscriptions', icon: '📋', k: 'acc.subscriptions' },
                { href: '/account/dogs', icon: '🐶', k: 'acc.dogs' },
                { href: '/account/referrals', icon: '🎁', k: 'acc.referrals' },
                { href: '/shop', icon: '🛍️', k: 'acc.shop' },
              ].map(l => (
                <Link key={l.href} href={l.href} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-teal-400 hover:shadow-sm transition">
                  <span className="text-xl" aria-hidden="true">{l.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{t(l.k)}</span>
                </Link>
              ))}
            </nav>

            <div className="md:col-span-2 space-y-6">
            {unverified && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">⚠️ {t('ver.banner')}</p>
                <Link href="/verify?redirect=/account" className="shrink-0 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700">{t('ver.bannerBtn')}</Link>
              </div>
            )}
            <section className="bg-white rounded-2xl border border-gray-100 p-6">
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
                  <p className={`text-xs mt-1 ${user?.emailVerified ? 'text-teal-700' : 'text-amber-700'}`}>{user?.emailVerified ? `✓ ${t('acc.verified')}` : t('acc.notVerified')}</p>
                </div>
                <div>
                  {input('phone', t('co.f.phone'))}
                  <p className={`text-xs mt-1 ${user?.phoneVerified ? 'text-teal-700' : 'text-amber-700'}`}>{user?.phoneVerified ? `✓ ${t('acc.verified')}` : t('acc.notVerified')}</p>
                </div>
                <button type="submit" disabled={saving} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-teal-700 transition disabled:opacity-50">
                  {saving ? t('co.saving') : t('acc.save')}
                </button>
              </form>
            </section>
            <section className="bg-white rounded-2xl border border-gray-100 p-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-800">💌 {t('acc.consent')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('acc.consentSub')}</p>
              </div>
              <button type="button" onClick={toggleConsent} role="switch" aria-checked={!!user?.marketingConsent} aria-label={t('acc.consent')}
                className={`relative w-12 h-6 shrink-0 rounded-full transition-colors duration-200 ${user?.marketingConsent ? 'bg-teal-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${user?.marketingConsent ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </section>
            <AccountSecurity />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
