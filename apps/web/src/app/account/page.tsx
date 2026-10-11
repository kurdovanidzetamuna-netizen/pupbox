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
      <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1.5">{label}{required && <span className="text-red-500"> *</span>}</label>
      <input id={key} value={form[key]} type={key === 'phone' ? 'tel' : 'text'} aria-invalid={!!fieldErrors[key]}
        onChange={e => { setForm({ ...form, [key]: e.target.value }); setFieldErrors(f => ({ ...f, [key]: '' })); }}
        className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${fieldErrors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
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

  const quick = [
    { href: '/account/subscriptions', icon: '📋', k: 'acc.subscriptions', tint: 'bg-teal-50 text-teal-700' },
    { href: '/account/orders', icon: '📦', k: 'acc.orders', tint: 'bg-sky-50 text-sky-700' },
    { href: '/account/dogs', icon: '🐶', k: 'acc.dogs', tint: 'bg-amber-50 text-amber-700', count: user?.dogs?.length },
    { href: '/account/referrals', icon: '🎁', k: 'acc.referrals', tint: 'bg-peach-50 text-peach-600' },
    { href: '/shop', icon: '🛍️', k: 'acc.shop', tint: 'bg-lilac-50 text-lilac-600' },
  ];

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>
      ) : (
        <>
          <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-teal-50 via-white to-lilac-50 ring-1 ring-teal-100/70 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 shadow-soft">
            <div className="absolute -right-10 -top-12 w-48 h-48 rounded-full bg-teal-100/60 blur-2xl pointer-events-none" aria-hidden="true" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-300 to-teal-500 text-white text-2xl font-extrabold flex items-center justify-center shrink-0 shadow-glow">
              {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
            </div>
            <div className="relative flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 truncate">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || t('acc.title')}</h1>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            </div>
            <div className="relative flex gap-3">
              <Link href="/prices" className="inline-flex items-center justify-center bg-teal-600 text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-teal-700 transition shadow-sm whitespace-nowrap">+ {t('acc.subscribe')}</Link>
              <button onClick={logout} className="inline-flex items-center justify-center bg-white/80 ring-1 ring-gray-200 text-gray-600 text-sm font-semibold px-5 py-3 rounded-full hover:ring-red-200 hover:text-red-600 transition whitespace-nowrap">{t('acc.signOut')}</button>
            </div>
          </header>

          {unverified && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-medium text-amber-900">⚠️ {t('ver.banner')}</p>
              <Link href="/verify?redirect=/account" className="shrink-0 text-center bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-700">{t('ver.bannerBtn')}</Link>
            </div>
          )}

          <nav aria-label={t('acc.title')} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            {quick.map(l => (
              <Link key={l.href} href={l.href} className="group bg-white ring-1 ring-gray-200/60 rounded-3xl p-5 shadow-soft hover:ring-teal-200 hover:-translate-y-1 transition-all duration-300">
                <span className={`inline-flex w-11 h-11 rounded-xl items-center justify-center text-xl mb-3 ${l.tint}`} aria-hidden="true">{l.icon}</span>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-800">{t(l.k)}</span>
                  {l.count ? <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{l.count}</span> : <span className="text-gray-300 group-hover:text-teal-600 transition">→</span>}
                </span>
              </Link>
            ))}
          </nav>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <section className="bg-white rounded-[28px] ring-1 ring-gray-200/60 shadow-soft p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6">{t('acc.profile')}</h2>
              {success && <p className="text-teal-700 text-sm mb-5 bg-teal-50 px-4 py-3 rounded-xl" role="status">{success}</p>}
              {error && <p className="text-red-600 text-sm mb-5 bg-red-50 px-4 py-3 rounded-xl" role="alert">{error}</p>}
              <form onSubmit={save} className="space-y-5" noValidate>
                <div className="grid sm:grid-cols-2 gap-5">
                  {input('firstName', t('co.f.firstName'), true)}
                  {input('lastName', t('co.f.lastName'), true)}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">{t('acc.email')}</label>
                  <input id="email" value={user?.email || ''} disabled className="w-full border border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-500" />
                  <p className={`text-xs mt-1.5 ${user?.emailVerified ? 'text-teal-700' : 'text-amber-700'}`}>{user?.emailVerified ? `✓ ${t('acc.verified')}` : t('acc.notVerified')}</p>
                </div>
                <div>
                  {input('phone', t('co.f.phone'))}
                  <p className={`text-xs mt-1.5 ${user?.phoneVerified ? 'text-teal-700' : 'text-amber-700'}`}>{user?.phoneVerified ? `✓ ${t('acc.verified')}` : t('acc.notVerified')}</p>
                </div>
                <button type="submit" disabled={saving} className="bg-teal-600 text-white px-7 py-3 rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-50">
                  {saving ? t('co.saving') : t('acc.save')}
                </button>
              </form>
            </section>

            <div className="space-y-6">
              <section className="bg-white rounded-[28px] ring-1 ring-gray-200/60 shadow-soft p-6 sm:p-8 flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">💌 {t('acc.consent')}</h2>
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{t('acc.consentSub')}</p>
                </div>
                <button type="button" onClick={toggleConsent} role="switch" aria-checked={!!user?.marketingConsent} aria-label={t('acc.consent')}
                  className={`relative w-12 h-7 shrink-0 rounded-full transition-colors duration-200 ${user?.marketingConsent ? 'bg-teal-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${user?.marketingConsent ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </section>
              <AccountSecurity />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
