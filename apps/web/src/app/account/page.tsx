'use client';
import { signOut } from '@/lib/signOut';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import AccountSecurity from '@/components/AccountSecurity';
import Field from '@/components/ui/Field';
import AddressBook from '@/components/AddressBook';
import IconButton from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/icons';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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

  const [askOut, setAskOut] = useState(false);
  function logout() {
    signOut();
    router.push('/');
  }

  const field = (key: 'firstName' | 'lastName' | 'phone', label: string, required = false) => (
    <Field id={key} label={label} required={required} value={form[key]} type={key === 'phone' ? 'tel' : 'text'}
      autoComplete={key === 'phone' ? 'tel' : key === 'firstName' ? 'given-name' : 'family-name'} error={fieldErrors[key]}
      onChange={v => { setForm({ ...form, [key]: v }); setFieldErrors(f => ({ ...f, [key]: '' })); setSuccess(''); }} />
  );
  const changed = !!user && (form.firstName !== (user.firstName || '') || form.lastName !== (user.lastName || '') || form.phone !== (user.phone || ''));

  async function toggleChannel(channel: 'marketingEmail' | 'marketingSms') {
    const next = !user?.[channel];
    setUser((u: any) => ({ ...u, [channel]: next })); // feels instant; rolled back on failure
    try {
      const res = await authFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ [channel]: next }) });
      if (!res.ok) throw new Error();
      setUser(await res.json());
    } catch (err) {
      setUser((u: any) => ({ ...u, [channel]: !next }));
      if (err instanceof SessionExpiredError) return router.replace(loginUrl('/account'));
      setError(t('acc.saveFailed'));
    }
  }

  const unverified = user && (!user.emailVerified || !user.phoneVerified);

  const quick = [
    { href: '/account/subscriptions', icon: '📋', k: 'acc.subscriptions', tint: 'bg-teal-50' },
    { href: '/account/orders', icon: '📦', k: 'acc.orders', tint: 'bg-sky-50' },
    { href: '/account/dogs', icon: '🐶', k: 'acc.dogs', tint: 'bg-amber-50', count: user?.dogs?.length },
    { href: '/account/referrals', icon: '🎁', k: 'acc.referrals', tint: 'bg-peach-50' },
    { href: '/shop', icon: '🛍️', k: 'acc.shop', tint: 'bg-lilac-50' },
  ];
  // Confirmed: just a small check; not yet confirmed: a small amber dot (both with a tooltip).
  const badge = (ok: boolean) => ok ? (
    <span title={t('acc.verifiedIcon')} aria-label={t('acc.verifiedIcon')} className="flex w-5 h-5 rounded-full bg-teal-100 text-teal-700 items-center justify-center">
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 6.2l2.2 2.2 4.8-4.9" /></svg>
    </span>
  ) : (
    <span title={t('acc.notVerified')} aria-label={t('acc.notVerified')} className="block w-2.5 h-2.5 rounded-full bg-amber-400" />
  );
  const toggle = (on: boolean, onClick: () => void, label: string) => (
    <button type="button" onClick={onClick} role="switch" aria-checked={on} aria-label={label}
      className={`relative w-10 h-6 shrink-0 rounded-full transition-colors duration-200 ${on ? 'bg-teal-500' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>
      ) : (
        <>
          <header className="bg-white rounded-3xl ring-1 ring-gray-200/60 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 text-xl font-bold flex items-center justify-center shrink-0">
              {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate capitalize">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || t('acc.title')}</h1>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            </div>
            <div className="flex gap-2">
              <Link href="/prices#plans" className="inline-flex items-center justify-center bg-teal-600 text-white text-sm font-semibold px-4 py-2 hover:bg-teal-700 whitespace-nowrap">+ {t('acc.subscribe')}</Link>
              <IconButton icon="logout" label={t('acc.signOut')} onClick={() => setAskOut(true)} />
            </div>
          </header>

          {unverified && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-5 py-3">
              <p className="text-sm text-amber-900">⚠️ {t('ver.banner')}</p>
              <Link href="/verify?redirect=/account" className="shrink-0 text-center bg-amber-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-amber-600">{t('ver.bannerBtn')}</Link>
            </div>
          )}

          <nav aria-label={t('acc.title')} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {quick.map(l => (
              <Link key={l.href} href={l.href} className="group flex items-center gap-3 bg-white ring-1 ring-gray-200/60 rounded-2xl px-4 py-3 hover:ring-teal-200 transition-colors">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${l.tint}`} aria-hidden="true">{l.icon}</span>
                <span className="flex-1 min-w-0 text-[13px] font-medium text-gray-800 leading-tight">{t(l.k)}</span>
                {l.count ? <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{l.count}</span> : null}
              </Link>
            ))}
          </nav>

          <div className="grid lg:grid-cols-5 gap-5 items-start">
            <section className="lg:col-span-3 bg-white rounded-3xl ring-1 ring-gray-200/60 p-5 sm:p-6">
              <h2 className="text-[15px] font-bold text-gray-900 mb-4">{t('acc.details')}</h2>
              {error && <p className="text-red-600 text-sm mb-4 bg-red-50 px-4 py-2.5 rounded-xl" role="alert">{error}</p>}
              <form onSubmit={save} className="space-y-3" noValidate>
                <div className="grid sm:grid-cols-2 gap-3">
                  {field('firstName', t('co.f.firstName'), true)}
                  {field('lastName', t('co.f.lastName'), true)}
                </div>
                <Field id="email" label={t('acc.email')} value={user?.email || ''} disabled trailing={badge(!!user?.emailVerified)} />
                <Field id="phone" type="tel" label={t('co.f.phone')} value={form.phone} autoComplete="tel" error={fieldErrors.phone} trailing={badge(!!user?.phoneVerified)}
                  onChange={v => { setForm({ ...form, phone: v }); setFieldErrors(f => ({ ...f, phone: '' })); setSuccess(''); }} />
                <div className="flex items-center justify-end gap-3 pt-1">
                  {success && <span className="text-sm text-teal-700" role="status">{success}</span>}
                  <button type="submit" disabled={saving || !changed} className="bg-teal-600 text-white text-sm font-semibold px-5 py-2 hover:bg-teal-700 disabled:opacity-40">
                    {saving ? t('co.saving') : t('acc.save')}
                  </button>
                </div>
              </form>
            </section>

            <div className="lg:col-span-2 space-y-5">
              <section className="bg-white rounded-3xl ring-1 ring-gray-200/60 px-5 sm:px-6 py-2">
                <h2 className="text-[15px] font-bold text-gray-900 pt-4">{t('acc.notifs')}</h2>
                <p className="text-xs text-gray-500 mt-1 mb-1 leading-relaxed">{t('acc.notifsSub')}</p>
                <div className="flex items-center justify-between gap-4 py-3.5 border-b border-gray-100">
                  <span className="text-[13px] font-medium text-gray-800">✉️ {t('acc.notifEmail')}</span>
                  {toggle(!!user?.marketingEmail, () => toggleChannel('marketingEmail'), t('acc.notifEmail'))}
                </div>
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <span className="text-[13px] font-medium text-gray-800">💬 {t('acc.notifSms')}</span>
                  {toggle(!!user?.marketingSms, () => toggleChannel('marketingSms'), t('acc.notifSms'))}
                </div>
              </section>
              <AccountSecurity />
            </div>
          </div>

          <AddressBook onExpired={() => router.replace(loginUrl('/account'))} />

          <section className="bg-white rounded-3xl ring-1 ring-gray-200/60 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-[15px] font-bold text-gray-900">{t('cards.title')}</h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 bg-teal-50 rounded-full px-2.5 py-1">
                <Icon name="lock" className="w-3.5 h-3.5" />{t('cards.secure')}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {/* A ghost of a card: shows where saved cards will live, with no made-up numbers. */}
              <div className="relative aspect-[1.6/1] max-h-44 rounded-2xl bg-gradient-to-br from-lilac-100 via-teal-50 to-teal-100 ring-1 ring-teal-100 p-4 flex flex-col justify-between overflow-hidden">
                <div className="absolute -right-8 -bottom-10 w-40 h-40 rounded-full bg-white/40" aria-hidden="true" />
                <div className="flex items-center justify-between">
                  <span className="w-9 h-7 rounded-md bg-gradient-to-br from-amber-200 to-amber-300/80" aria-hidden="true" />
                  <Icon name="card" className="w-6 h-6 text-teal-700/50" />
                </div>
                <div aria-hidden="true" className="flex gap-3 text-teal-900/25 text-lg tracking-[0.2em] font-bold">•••• •••• •••• ••••</div>
                <p className="relative text-[12px] font-medium text-teal-900/60">{t('cards.soon')}</p>
              </div>
              <button type="button" disabled aria-label={t('cards.add')} title={t('cards.soon')}
                className="aspect-[1.6/1] max-h-44 rounded-2xl border-2 border-dashed border-gray-200 text-gray-300 flex items-center justify-center cursor-not-allowed">
                <Icon name="plus" className="w-6 h-6" strokeWidth={2.2} />
              </button>
            </div>
          </section>
        </>
      )}

      <ConfirmDialog open={askOut} onClose={() => setAskOut(false)} onConfirm={logout}
        title={t('acc.signOutQ')} message={t('acc.signOutInfo')} confirmLabel={t('acc.signOut')} />
    </div>
  );
}
