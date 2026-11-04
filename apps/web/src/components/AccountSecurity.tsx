'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, loginUrl, responseError as msg, SessionExpiredError } from '@/lib/authFetch';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Field from '@/components/ui/Field';
import IconButton from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/icons';
import { FormAlert, revealFirstError } from '@/components/ui/FormError';
import { fill } from '@/context/strings/purchase';
import { loadProviders, providerToken, SignInCancelled, type Provider, type Providers } from '@/lib/social';
import { FacebookMark, GoogleMark } from '@/components/SocialSignIn';


interface Methods { hasPassword: boolean; identities: { provider: 'GOOGLE' | 'FACEBOOK'; email: string | null }[] }
const NAME: Record<Provider, string> = { google: 'Google', facebook: 'Facebook' };

/**
 * Sign-in & security, compact: the password row ("Change", or "Set a
 * password" for an account made with Google or Facebook), a row for Google
 * and Facebook each (connect / disconnect — never the last way in), and a
 * small "Delete account" whose details are in the confirmation pop-up.
 */
export default function AccountSecurity() {
  const router = useRouter();
  const { t } = useLanguage();
  const expired = () => router.replace(loginUrl('/account'));

  // ── How I sign in ──
  const [methods, setMethods] = useState<Methods | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [linkBusy, setLinkBusy] = useState<Provider | null>(null);
  const [linkError, setLinkError] = useState('');
  const [unlinking, setUnlinking] = useState<Provider | null>(null);
  useEffect(() => {
    authFetch('/auth/methods').then((r) => (r.ok ? r.json() : null)).then(setMethods).catch((e) => { if (e instanceof SessionExpiredError) expired(); });
    loadProviders().then(setProviders);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const hasPassword = methods?.hasPassword !== false;
  const linked = (p: Provider) => methods?.identities.find((i) => i.provider === p.toUpperCase());

  async function link(p: Provider) {
    setLinkBusy(p); setLinkError('');
    try {
      const token = await providerToken(p);
      const res = await authFetch(`/auth/link/${p}`, { method: 'POST', body: JSON.stringify({ token }) });
      if (!res.ok) throw new Error(await msg(res, t('soc.failed')));
      setMethods(await res.json());
    } catch (e: any) {
      if (e instanceof SessionExpiredError) return expired();
      if (!(e instanceof SignInCancelled)) setLinkError(e?.message && e.message !== 'script' && e.message !== 'off' ? e.message : t('soc.failed'));
    } finally { setLinkBusy(null); }
  }

  async function unlink() {
    if (!unlinking) return;
    setLinkBusy(unlinking); setLinkError('');
    try {
      const res = await authFetch(`/auth/link/${unlinking}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await msg(res, t('co.e.generic')));
      setMethods(await res.json());
      setUnlinking(null);
    } catch (e: any) {
      if (e instanceof SessionExpiredError) return expired();
      setLinkError(e.message); setUnlinking(null);
    } finally { setLinkBusy(null); }
  }

  // ── Change password: step 1 current, step 2 new + repeat, then done ──
  const [pwOpen, setPwOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  // Which field the message belongs under.
  const [pwErr, setPwErr] = useState<{ at: 'current' | 'next' | 'again'; text: string } | null>(null);
  const setPwError = (text: string, at: 'current' | 'next' | 'again' = 'again') => setPwErr(text ? { at, text } : null);
  const pwError = (at: 'current' | 'next' | 'again') => (pwErr?.at === at ? pwErr.text : '');
  const [pwSaving, setPwSaving] = useState(false);

  function openPw() { setPw({ current: '', next: '', again: '' }); setPwError(''); setStep(hasPassword ? 1 : 2); setPwOpen(true); }

  async function savePassword() {
    if (pw.next.length < 8) return setPwError(t('rp.e.short'), 'next');
    if (pw.next !== pw.again) return setPwError(t('rp.e.match'));
    setPwSaving(true); setPwError('');
    try {
      const res = await authFetch('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: pw.current || undefined, newPassword: pw.next }) });
      if (!res.ok) {
        // A wrong current password sends them back to step 1 with the reason.
        const text = await msg(res, t('co.e.generic'));
        if (res.status === 400) { setStep(1); return setPwError(text, 'current'); }
        return setPwError(text);
      }
      const data = await res.json().catch(() => ({}));
      // The old sign-in stopped working with the change; keep this device signed in.
      if (data.token) localStorage.setItem('pupbox_token', data.token);
      setMethods((m) => (m ? { ...m, hasPassword: true } : m));
      setStep(3);
    } catch (err) {
      if (err instanceof SessionExpiredError) return expired();
      setPwError(t('co.e.generic'));
    } finally { setPwSaving(false); }
  }

  // ── Delete account ──
  const [delOpen, setDelOpen] = useState(false);
  const [delPassword, setDelPassword] = useState('');
  const [delError, setDelError] = useState('');
  const [delFieldError, setDelFieldError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    if (hasPassword && !delPassword) { setDelFieldError(t('login.e.password')); return revealFirstError(); }
    setDeleting(true); setDelError('');
    try {
      const res = await authFetch('/auth/delete-account', { method: 'POST', body: JSON.stringify(hasPassword ? { password: delPassword } : {}) });
      if (!res.ok) return setDelError(await msg(res, t('co.e.generic')));
      localStorage.removeItem('pupbox_token');
      router.replace('/?deleted=1');
    } catch (err) {
      if (err instanceof SessionExpiredError) return expired();
      setDelError(t('co.e.generic'));
    } finally { setDeleting(false); }
  }

  // A row's button drops under its text when the screen is too narrow for both.
  const row = 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4 [&>div:first-child]:flex-1 [&>div:first-child]:min-w-[10rem]';
  return (
    <section className="bg-white rounded-3xl ring-1 ring-gray-200/60 px-5 sm:px-6 py-2">
      <h2 className="text-[15px] font-bold text-gray-900 pt-4 pb-1">{t('acc.security')}</h2>
      <div className={`${row} border-b border-gray-100`}>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center"><Icon name="key" className="w-[18px] h-[18px]" /></span>
          <div>
            <p className="text-[13px] font-medium text-gray-800">{t('acc.password')}</p>
            {hasPassword
              ? <p className="text-sm text-gray-400 tracking-widest leading-none">••••••••</p>
              : <p className="text-[12px] text-gray-500">{t('acc.pwNone')}</p>}
          </div>
        </div>
        {hasPassword
          ? <IconButton icon="edit" label={t('acc.passwordChange')} tone="primary" onClick={openPw} />
          : <button type="button" onClick={openPw} className="shrink-0 h-9 px-4 rounded-[12px] bg-teal-600 text-white text-[13px] font-semibold hover:bg-teal-700">{t('acc.pwSet')}</button>}
      </div>
      {(['google', 'facebook'] as Provider[]).filter((p) => linked(p) || providers?.[p]).map((p) => {
        const on = linked(p);
        return (
          <div key={p} className={`${row} border-b border-gray-100`}>
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${p === 'google' ? 'bg-white ring-1 ring-gray-200' : 'bg-[#1877F2] text-white'}`}>{p === 'google' ? <GoogleMark /> : <FacebookMark />}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-gray-800">{NAME[p]}</p>
                <p className={`text-[12px] truncate ${on ? 'text-teal-700' : 'text-gray-400'}`}>{on ? (on.email ? `${t('acc.linked')} · ${on.email}` : t('acc.linked')) : t('acc.notLinked')}</p>
              </div>
            </div>
            {on
              ? <button type="button" onClick={() => setUnlinking(p)} disabled={!!linkBusy} className="shrink-0 h-9 px-3.5 rounded-[12px] text-[13px] font-semibold text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50">{t('acc.unlink')}</button>
              : <button type="button" onClick={() => link(p)} disabled={!!linkBusy || !providers?.[p]} aria-busy={linkBusy === p} className="shrink-0 h-9 px-3.5 rounded-[12px] text-[13px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100">{linkBusy === p ? t('ui.wait') : t('acc.link')}</button>}
          </div>
        );
      })}
      {linkError && <FormAlert message={linkError} className="my-3" />}
      <div className={row}>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-red-50 text-red-400 flex items-center justify-center"><Icon name="trash" className="w-[18px] h-[18px]" /></span>
          <p className="text-[13px] font-medium text-gray-800">{t('acc.delete')}</p>
        </div>
        <IconButton icon="trash" label={t('acc.delete')} tone="danger" onClick={() => { setDelPassword(''); setDelError(''); setDelFieldError(''); setDelOpen(true); }} />
      </div>

      <Modal open={pwOpen} onClose={() => !pwSaving && setPwOpen(false)} title={step === 3 ? t('acc.pwDone') : hasPassword ? t('acc.password') : t('acc.pwSet')}
        dirty={step < 3 && !pwSaving && !!(pw.current || pw.next || pw.again)}>
        {step < 3 && hasPassword && (
          <div className="flex gap-1.5 mb-5" aria-hidden="true">
            <span className="h-1 flex-1 rounded-full bg-teal-400" />
            <span className={`h-1 flex-1 rounded-full transition-colors ${step === 2 ? 'bg-teal-400' : 'bg-gray-200'}`} />
          </div>
        )}
        {step === 1 && (
          <form noValidate onSubmit={(e) => { e.preventDefault(); if (!pw.current) return setPwError(t('login.e.password'), 'current'); setPwError(''); setStep(2); }} className="space-y-4">
            <p className="text-sm text-gray-600">{t('acc.pwStep1')}</p>
            <Field id="pw-current" type="password" label={t('acc.pwCurrent')} value={pw.current} autoComplete="current-password" required
              onChange={(v) => { setPw({ ...pw, current: v }); setPwError(''); }} error={pwError('current')} />
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-teal-600 text-white text-sm font-semibold px-6 py-2.5 hover:bg-teal-700">{t('ui.next')}</button>
            </div>
          </form>
        )}
        {step === 2 && (
          <form noValidate onSubmit={(e) => { e.preventDefault(); savePassword(); }} className="space-y-4">
            <p className="text-sm text-gray-600">{t(hasPassword ? 'acc.pwStep2' : 'acc.pwSetStep')}</p>
            <Field id="pw-new" type="password" label={t('acc.pwNew')} value={pw.next} autoComplete="new-password" hint={t('acc.pwHint')} required
              onChange={(v) => { setPw({ ...pw, next: v }); setPwError(''); }} error={pwError('next')} />
            <Field id="pw-again" type="password" label={t('acc.pwAgain')} value={pw.again} autoComplete="new-password" required
              onChange={(v) => { setPw({ ...pw, again: v }); setPwError(''); }} error={pwError('again')} />
            <div className="flex justify-between pt-2">
              {hasPassword ? <button type="button" onClick={() => { setStep(1); setPwError(''); }} className="px-4 py-2.5 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100">{t('ui.back')}</button> : <span />}
              <button type="submit" disabled={pwSaving} className="bg-teal-600 text-white text-sm font-semibold px-6 py-2.5 hover:bg-teal-700">{pwSaving ? t('ui.wait') : t('acc.save')}</button>
            </div>
          </form>
        )}
        {step === 3 && (
          <div className="text-center py-2">
            <div className="text-4xl mb-3 animate-[pop_0.35s_ease-out]" aria-hidden="true">🔐</div>
            <p className="text-sm text-gray-600 mb-6">{t('sec.changed')}</p>
            <button type="button" onClick={() => setPwOpen(false)} className="bg-teal-600 text-white text-sm font-semibold px-8 py-2.5 hover:bg-teal-700">{t('ui.done')}</button>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)} onConfirm={deleteAccount} busy={deleting} error={delError}
        tone="danger" title={t('acc.deleteTitle')} confirmLabel={t('acc.deleteConfirm')}
        message={<><p>{t('acc.deleteInfo1')}</p><p>{t('acc.deleteInfo2')}</p></>}>
        {hasPassword && (
          <Field id="del-pw" type="password" label={t('acc.deletePw')} value={delPassword} autoComplete="current-password" required error={delFieldError}
            onChange={(v) => { setDelPassword(v); setDelError(''); setDelFieldError(''); }} />
        )}
      </ConfirmDialog>

      <ConfirmDialog open={!!unlinking} onClose={() => setUnlinking(null)} onConfirm={unlink} busy={!!linkBusy}
        title={fill(t('acc.unlinkTitle'), { provider: unlinking ? NAME[unlinking] : '' })} confirmLabel={t('acc.unlink')}
        message={<p>{fill(t('acc.unlinkInfo'), { provider: unlinking ? NAME[unlinking] : '' })}</p>} />
    </section>
  );
}
