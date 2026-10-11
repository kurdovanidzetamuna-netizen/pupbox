'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch } from '@/lib/authFetch';
import Confetti from '@/components/Confetti';
import OtpInput from '@/components/ui/OtpInput';
import PhoneInput from '@/components/ui/PhoneInput';
import { Icon } from '@/components/ui/icons';

type Channel = 'PHONE' | 'EMAIL';
interface Me { email: string; phone: string | null; emailVerified: boolean; phoneVerified: boolean }

const mask = (phone: string | null) => (phone ? `${phone.slice(0, 7)}•••${phone.slice(-2)}` : '');
const message = async (res: Response, fallback: string) => {
  const d = await res.json().catch(() => ({}));
  return (Array.isArray(d?.message) ? d.message[0] : d?.message) || fallback;
};

/**
 * Confirms the signed-in customer's phone (SMS code) and email (emailed
 * code). Codes were sent at sign-up; each box can ask for a new one after a
 * minute. A wrong number can be corrected here. Calls `onDone` once both
 * are confirmed.
 */
export default function VerifyCodes({ onDone }: { onDone: () => void }) {
  const { t } = useLanguage();
  const [me, setMe] = useState<Me | null>(null);
  const [codes, setCodes] = useState<Record<Channel, string>>({ PHONE: '', EMAIL: '' });
  const [errors, setErrors] = useState<Record<Channel, string>>({ PHONE: '', EMAIL: '' });
  const [notes, setNotes] = useState<Record<Channel, string>>({ PHONE: '', EMAIL: '' });
  const [busy, setBusy] = useState<Channel | null>(null);
  // Seconds until each box may ask for a new code (the server allows one a minute).
  const [wait, setWait] = useState<Record<Channel, number>>({ PHONE: 60, EMAIL: 60 });
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);

  useEffect(() => {
    // Not signed in (or the session ended): sign in first, then come back here.
    authFetch('/users/me').then(r => r.json()).then(setMe)
      .catch(() => { window.location.href = `/login?redirect=${encodeURIComponent('/verify')}`; });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setWait(w => ({ PHONE: Math.max(0, w.PHONE - 1), EMAIL: Math.max(0, w.EMAIL - 1) })), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (me?.emailVerified && me.phoneVerified) {
      const id = setTimeout(onDone, 700); // let the second ✓ register before moving on
      return () => clearTimeout(id);
    }
  }, [me, onDone]);

  async function confirm(channel: Channel, typed?: string) {
    const code = (typed ?? codes[channel]).replace(/\D/g, '');
    if (code.length !== 6) { setErrors(e => ({ ...e, [channel]: t('ver.code') })); return; }
    setBusy(channel); setErrors(e => ({ ...e, [channel]: '' }));
    try {
      const res = await authFetch('/auth/verify', { method: 'POST', body: JSON.stringify({ channel, code }) });
      if (!res.ok) throw new Error(await message(res, 'Error'));
      const state = await res.json();
      setMe(m => (m ? { ...m, emailVerified: state.emailVerified, phoneVerified: state.phoneVerified } : m));
    } catch (e: any) {
      setErrors(er => ({ ...er, [channel]: e.message }));
      setCodes(c => ({ ...c, [channel]: '' })); // a wrong code is cleared for another try
    } finally { setBusy(null); }
  }

  async function resend(channel: Channel) {
    setBusy(channel); setErrors(e => ({ ...e, [channel]: '' })); setNotes(n => ({ ...n, [channel]: '' }));
    try {
      const res = await authFetch('/auth/verify/send', { method: 'POST', body: JSON.stringify({ channel }) });
      if (!res.ok) throw new Error(await message(res, 'Error'));
      setNotes(n => ({ ...n, [channel]: t('ver.sent') }));
      setWait(w => ({ ...w, [channel]: 60 }));
    } catch (e: any) {
      setErrors(er => ({ ...er, [channel]: e.message }));
    } finally { setBusy(null); }
  }

  async function savePhone() {
    setBusy('PHONE'); setErrors(e => ({ ...e, PHONE: '' }));
    try {
      const res = await authFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ phone: newPhone }) });
      if (!res.ok) throw new Error(await message(res, t('reg.e.phone')));
      const u = await res.json();
      setMe(m => (m ? { ...m, phone: u.phone, phoneVerified: u.phoneVerified } : m));
      setEditingPhone(false);
      setBusy(null);
      await resend('PHONE');
    } catch (e: any) {
      setErrors(er => ({ ...er, PHONE: e.message }));
      setBusy(null);
    }
  }

  if (!me) return <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>;

  const row = (channel: Channel) => {
    const done = channel === 'PHONE' ? me.phoneVerified : me.emailVerified;
    const to = channel === 'PHONE' ? mask(me.phone) : me.email;
    const title = channel === 'PHONE' ? 'SMS' : t('acc.notifEmail');
    if (done) {
      return (
        <div className="flex items-center gap-3 rounded-2xl bg-teal-50/70 px-4 py-3 animate-[fadeUp_0.2s_ease-out]">
          <span className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0"><Icon name="check" className="w-[18px] h-[18px]" strokeWidth={2.4} /></span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-900">{title}</p>
            <p className="text-[12px] text-gray-500 truncate">{to}</p>
          </div>
          <span className="ml-auto text-[12px] font-semibold text-teal-700">{t('ver.done')}</span>
        </div>
      );
    }
    return (
      <div className="rounded-2xl ring-1 ring-gray-200/70 p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0"><Icon name={channel === 'PHONE' ? 'phone' : 'mail'} className="w-[18px] h-[18px]" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-gray-900">{title}</p>
            <p className="text-[12px] text-gray-500 truncate">{to}</p>
          </div>
          {busy === channel && <span className="w-5 h-5 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" aria-hidden="true" />}
        </div>
        {channel === 'PHONE' && editingPhone ? (
          <form onSubmit={e => { e.preventDefault(); if (phoneValid) savePhone(); }} className="animate-[fadeUp_0.15s_ease-out]">
            <PhoneInput id="new-phone" label={t('reg.phone')} value={newPhone} autoFocus
              onChange={(v, ok) => { setNewPhone(v); setPhoneValid(ok); }}
              trailing={
                <button type="submit" disabled={!phoneValid || busy === 'PHONE'} aria-label={t('ver.savePhone')} title={t('ver.savePhone')}
                  className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${phoneValid ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              } />
            <div className="mt-2 flex items-center justify-between gap-3 text-[12px]">
              <span className="text-gray-400">{t('ver.newNumberHint')}</span>
              <button type="button" onClick={() => setEditingPhone(false)} aria-label={t('ui.cancel')} title={t('ui.cancel')}
                className="w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center"><Icon name="close" className="w-3.5 h-3.5" strokeWidth={2.4} /></button>
            </div>
          </form>
        ) : (
          <OtpInput label={t('ver.code')} value={codes[channel]} disabled={busy === channel} error={!!errors[channel]}
            onChange={v => { setCodes(c => ({ ...c, [channel]: v })); setErrors(er => ({ ...er, [channel]: '' })); }}
            onComplete={v => confirm(channel, v)} />
        )}
        {errors[channel] && <p className="text-red-500 text-[12px] mt-2" role="alert">{errors[channel]}</p>}
        {notes[channel] && !errors[channel] && <p className="text-teal-700 text-[12px] mt-2">{notes[channel]}</p>}
        {!(channel === 'PHONE' && editingPhone) && <div className="mt-2.5 flex items-center gap-4 text-[12px]">
          {wait[channel] > 0
            ? <span className="text-gray-400 tabular-nums">{fill(t('ver.resendIn'), { s: wait[channel] })}</span>
            : <button type="button" onClick={() => resend(channel)} disabled={busy === channel} className="text-teal-700 font-semibold hover:underline">{t('ver.resend')}</button>}
          {channel === 'PHONE' && !editingPhone && (
            <button type="button" onClick={() => { setEditingPhone(true); setNewPhone(''); setPhoneValid(false); }} className="text-gray-500 hover:text-gray-800">{t('ver.changePhone')}</button>
          )}
        </div>}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {row('PHONE')}
      {row('EMAIL')}
      {me.emailVerified && me.phoneVerified && <><Confetti count={18} /><p className="text-center font-bold text-teal-700 pt-2 animate-[pop_0.4s_ease-out]">{t('ver.allSet')}</p></>}
    </div>
  );
}
