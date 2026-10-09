'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';

const field = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400';

/** Change password, and delete the account — the bottom of the account page. */
export default function AccountSecurity() {
  const router = useRouter();
  const { t } = useLanguage();

  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delPassword, setDelPassword] = useState('');
  const [delError, setDelError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const expired = () => router.replace(loginUrl('/account'));

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next.length < 8) return setPwMsg({ ok: false, text: t('rp.e.short') });
    if (pw.next !== pw.again) return setPwMsg({ ok: false, text: t('rp.e.match') });
    setPwSaving(true); setPwMsg(null);
    try {
      const res = await authFetch('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400) return setPwMsg({ ok: false, text: t('sec.e.current') });
      if (!res.ok) throw new Error();
      // The old sign-in stopped working with the change; keep this device signed in.
      localStorage.setItem('pupbox_token', data.token);
      setPw({ current: '', next: '', again: '' });
      setPwMsg({ ok: true, text: t('sec.changed') });
    } catch (err) {
      if (err instanceof SessionExpiredError) return expired();
      setPwMsg({ ok: false, text: t('co.e.generic') });
    } finally { setPwSaving(false); }
  }

  const [exporting, setExporting] = useState(false);
  /** A copy of everything we hold about the customer, saved as a file. */
  async function downloadData() {
    setExporting(true);
    try {
      const res = await authFetch('/users/me/export');
      if (!res.ok) throw new Error();
      const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `pupbox-my-data-${new Date().toISOString().slice(0, 10)}.json` }).click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof SessionExpiredError) return expired();
      alert(t('co.e.generic'));
    } finally { setExporting(false); }
  }

  async function deleteAccount() {
    if (!delPassword) return setDelError(t('login.e.password'));
    setDeleting(true); setDelError('');
    try {
      const res = await authFetch('/auth/delete-account', { method: 'POST', body: JSON.stringify({ password: delPassword }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const m = String(data.message ?? '');
        setDelError(/subscription/i.test(m) ? t('sec.e.subscription') : /password/i.test(m) ? t('sec.e.current') : t('co.e.generic'));
        return;
      }
      localStorage.removeItem('pupbox_token');
      router.replace('/?deleted=1');
    } catch (err) {
      if (err instanceof SessionExpiredError) return expired();
      setDelError(t('co.e.generic'));
    } finally { setDeleting(false); }
  }

  return (
    <>
      <section className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-5">{t('sec.title')}</h2>
        <form onSubmit={changePassword} className="space-y-4" noValidate>
          <div>
            <label htmlFor="cur-pw" className="block text-sm font-medium text-gray-700 mb-1">{t('sec.current')}</label>
            <input id="cur-pw" type="password" autoComplete="current-password" value={pw.current} onChange={e => { setPw({ ...pw, current: e.target.value }); setPwMsg(null); }} className={field} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-pw" className="block text-sm font-medium text-gray-700 mb-1">{t('rp.password')}</label>
              <input id="new-pw" type="password" autoComplete="new-password" value={pw.next} onChange={e => { setPw({ ...pw, next: e.target.value }); setPwMsg(null); }} className={field} />
            </div>
            <div>
              <label htmlFor="new-pw2" className="block text-sm font-medium text-gray-700 mb-1">{t('rp.confirm')}</label>
              <input id="new-pw2" type="password" autoComplete="new-password" value={pw.again} onChange={e => { setPw({ ...pw, again: e.target.value }); setPwMsg(null); }} className={field} />
            </div>
          </div>
          {pwMsg && <p className={`text-sm px-3 py-2 rounded-lg ${pwMsg.ok ? 'text-teal-700 bg-teal-50' : 'text-red-600 bg-red-50'}`} role={pwMsg.ok ? 'status' : 'alert'}>{pwMsg.text}</p>}
          <button type="submit" disabled={pwSaving || !pw.current} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-teal-700 transition disabled:opacity-50">
            {pwSaving ? t('co.saving') : t('sec.changeBtn')}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-1">{t('sec.dataTitle')}</h2>
        <p className="text-sm text-gray-500 mb-4">{t('sec.dataSub')}</p>
        <button onClick={downloadData} disabled={exporting} className="text-sm font-medium text-teal-700 border border-teal-200 px-4 py-2 rounded-xl hover:bg-teal-50 disabled:opacity-50">{exporting ? t('co.saving') : t('sec.dataBtn')}</button>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-1">{t('sec.deleteTitle')}</h2>
        <p className="text-sm text-gray-500 mb-4">{t('sec.deleteSub')}</p>
        {!delOpen ? (
          <button onClick={() => setDelOpen(true)} className="text-sm font-medium text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50">{t('sec.deleteBtn')}</button>
        ) : (
          <div className="space-y-3">
            <label htmlFor="del-pw" className="block text-sm font-medium text-gray-700">{t('sec.deleteConfirm')}</label>
            <input id="del-pw" type="password" autoComplete="current-password" value={delPassword} onChange={e => { setDelPassword(e.target.value); setDelError(''); }} className={field} />
            {delError && <p className="text-sm text-red-600" role="alert">{delError}</p>}
            <div className="flex gap-2">
              <button onClick={deleteAccount} disabled={deleting} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">{deleting ? t('co.saving') : t('sec.deleteFinal')}</button>
              <button onClick={() => { setDelOpen(false); setDelPassword(''); setDelError(''); }} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm">{t('dogs.cancel')}</button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
