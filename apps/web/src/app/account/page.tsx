'use client';
import { signOut } from '@/lib/signOut';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import AccountSecurity from '@/components/AccountSecurity';
import Field from '@/components/ui/Field';
import PhoneInput from '@/components/ui/PhoneInput';
import AddressBook from '@/components/AddressBook';
import PaymentCards from '@/components/PaymentCards';
import Modal from '@/components/ui/Modal';
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
  const [phoneOk, setPhoneOk] = useState(true);
  // Bumped to put the phone field back to the saved number.
  const [phoneKey, setPhoneKey] = useState(0);

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
    if (form.phone !== (user?.phone || '') && !phoneOk) errs.phone = t('reg.e.phone');
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await authFetch('/users/me', { method: 'PATCH', body: JSON.stringify(form) });
      const u = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((Array.isArray(u.message) ? u.message[0] : u.message) || t('acc.saveFailed'));
      setUser(u);
      setForm(f => ({ ...f, phone: u.phone || '' }));
      setPhoneKey(k => k + 1);
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
  const [notifOpen, setNotifOpen] = useState(false);
  // Turning a channel off asks once what they'd miss; both answers are one click.
  const [askOff, setAskOff] = useState<'marketingEmail' | 'marketingSms' | null>(null);
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
          {/* One slim row: who you are; the menu on the left has the sections. */}
          <header className="bg-white rounded-3xl ring-1 ring-gray-200/60 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-100 to-lilac-100 text-teal-700 text-[15px] font-bold flex items-center justify-center shrink-0">
                {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-[15px] font-bold text-gray-900 truncate capitalize leading-tight">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || t('acc.title')}</h1>
                <p className="text-[12px] text-gray-500 truncate">{user?.email}</p>
              </div>
              <Link href="/prices#plans" aria-label={t('acc.subscribe')} title={t('acc.subscribe')}
                className="inline-flex items-center gap-1 h-8 pl-2.5 pr-3 rounded-full bg-teal-50 text-teal-700 text-[12px] font-semibold hover:bg-teal-100 whitespace-nowrap">
                <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2.6} /><span className="hidden sm:inline">{t('acc.subscribe')}</span>
              </Link>
              <IconButton icon="logout" size="sm" label={t('acc.signOut')} onClick={() => setAskOut(true)} />
            </div>
          </header>

          {unverified && (
            <div className="flex items-center gap-3 rounded-2xl bg-amber-50 ring-1 ring-amber-200/70 pl-4 pr-1.5 py-1.5">
              <Icon name="alert" className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="flex-1 text-[12.5px] text-amber-900">{t('ver.banner')}</p>
              <Link href="/verify?redirect=/account" className="shrink-0 bg-amber-500 text-white px-3.5 py-1.5 rounded-full text-[12px] font-semibold hover:bg-amber-600">{t('ver.bannerBtn')}</Link>
            </div>
          )}


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
                <PhoneInput floatLabel key={phoneKey} id="phone" label={t('co.f.phone')} value={form.phone} error={fieldErrors.phone}
                  trailing={form.phone === (user?.phone || '') ? <span className="px-2">{badge(!!user?.phoneVerified)}</span> : undefined}
                  onChange={(v, valid) => { setForm(f => ({ ...f, phone: v })); setPhoneOk(valid); setFieldErrors(f => ({ ...f, phone: '' })); setSuccess(''); }} />
                {/* Buttons appear only once something was changed; Cancel puts it back. */}
                {changed ? (
                  <div className="flex items-center justify-end gap-2 pt-1 animate-[fadeUp_0.15s_ease-out]">
                    <button type="button" disabled={saving}
                      onClick={() => { setForm({ firstName: user.firstName || '', lastName: user.lastName || '', phone: user.phone || '' }); setPhoneKey(k => k + 1); setFieldErrors({}); setError(''); }}
                      className="px-4 py-2 rounded-full text-[13px] font-semibold text-gray-600 hover:bg-gray-100 transition">{t('ui.cancel')}</button>
                    <button type="submit" disabled={saving} className="bg-teal-600 text-white text-[13px] font-semibold px-5 py-2 hover:bg-teal-700">
                      {saving ? t('co.saving') : t('acc.save')}
                    </button>
                  </div>
                ) : success ? (
                  <p className="text-right text-[13px] text-teal-700 pt-1" role="status">✓ {success}</p>
                ) : null}
              </form>
            </section>

            <div className="lg:col-span-2 space-y-5">
              {/* Notifications: one quiet row; the switches live behind the gear. */}
              <section className="bg-white rounded-3xl ring-1 ring-gray-200/60 px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0"><Icon name="bell" className="w-[18px] h-[18px]" /></span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-800">{t('acc.notifs')}</p>
                    <p className="flex items-center gap-2 text-[12px] text-gray-400">
                      <span className={user?.marketingEmail ? 'text-teal-600' : ''} title={t('acc.notifEmail')}>✉️ {user?.marketingEmail ? '✓' : '–'}</span>
                      <span className={user?.marketingSms ? 'text-teal-600' : ''} title={t('acc.notifSms')}>💬 {user?.marketingSms ? '✓' : '–'}</span>
                    </p>
                  </div>
                </div>
                <IconButton icon="settings" label={t('acc.notifs')} onClick={() => setNotifOpen(true)} />
              </section>
              <AccountSecurity />
            </div>
          </div>

          <AddressBook onExpired={() => router.replace(loginUrl('/account'))} />

          <PaymentCards onExpired={() => router.replace(loginUrl('/account'))} />
        </>
      )}

      <Modal open={notifOpen} onClose={() => setNotifOpen(false)} title={t('acc.notifs')}>
        <div className="divide-y divide-gray-100">
          {([['marketingEmail', '✉️', 'acc.notifEmail'], ['marketingSms', '💬', 'acc.notifSms']] as const).map(([k, icon, label]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3">
              <span className="text-[13px] font-medium text-gray-800">{icon} {t(label)}</span>
              {toggle(!!user?.[k], () => (user?.[k] ? setAskOff(k) : toggleChannel(k)), t(label))}
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog open={!!askOff} onClose={() => setAskOff(null)} onConfirm={() => { const k = askOff!; setAskOff(null); toggleChannel(k); }}
        title={t('acc.offTitle')} message={t('acc.offInfo')} confirmLabel={t('acc.offConfirm')} cancelLabel={t('acc.offKeep')} cancelPrimary />

      <ConfirmDialog open={askOut} onClose={() => setAskOut(false)} onConfirm={logout}
        title={t('acc.signOutQ')} message={t('acc.signOutInfo')} confirmLabel={t('acc.signOut')} />
    </div>
  );
}
