'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch } from '@/lib/authFetch';
import Confetti from '@/components/Confetti';

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

  async function confirm(channel: Channel) {
    const code = codes[channel].replace(/\D/g, '');
    if (code.length !== 6) { setErrors(e => ({ ...e, [channel]: t('ver.code') })); return; }
    setBusy(channel); setErrors(e => ({ ...e, [channel]: '' }));
    try {
      const res = await authFetch('/auth/verify', { method: 'POST', body: JSON.stringify({ channel, code }) });
      if (!res.ok) throw new Error(await message(res, 'Error'));
      const state = await res.json();
      setMe(m => (m ? { ...m, emailVerified: state.emailVerified, phoneVerified: state.phoneVerified } : m));
    } catch (e: any) {
      setErrors(er => ({ ...er, [channel]: e.message }));
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

  const box = (channel: Channel) => {
    const done = channel === 'PHONE' ? me.phoneVerified : me.emailVerified;
    const label = channel === 'PHONE' ? fill(t('ver.phone'), { to: mask(me.phone) }) : fill(t('ver.email'), { to: me.email });
    return (
      <div className={`rounded-2xl border p-5 transition ${done ? 'border-teal-200 bg-teal-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-gray-800">{channel === 'PHONE' ? '📱' : '✉️'} {label}</p>
          {done && <span className="text-sm font-bold text-teal-700 whitespace-nowrap animate-[pop_0.3s_ease-out]">✓ {t('ver.done')}</span>}
        </div>
        {!done && (
          <>
            {channel === 'PHONE' && editingPhone ? (
              <div className="mt-3 flex gap-2">
                <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="599 12 34 56" autoComplete="tel"
                  className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                <button type="button" onClick={savePhone} disabled={busy === 'PHONE'} className="shrink-0 bg-teal-600 text-white px-4 rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">{t('ver.savePhone')}</button>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); confirm(channel); }} className="mt-3 flex gap-2">
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={codes[channel]} aria-label={t('ver.code')}
                  onChange={e => { const v = e.target.value.replace(/[^\d ]/g, ''); setCodes(c => ({ ...c, [channel]: v })); setErrors(er => ({ ...er, [channel]: '' })); }}
                  placeholder="••••••" className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-lg font-bold tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-teal-400" />
                <button type="submit" disabled={busy === channel} className="shrink-0 bg-teal-600 text-white px-5 rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">{t('ver.confirm')}</button>
              </form>
            )}
            {errors[channel] && <p className="text-red-500 text-xs mt-2" role="alert">{errors[channel]}</p>}
            {notes[channel] && !errors[channel] && <p className="text-teal-700 text-xs mt-2">{notes[channel]}</p>}
            <div className="mt-2 flex items-center gap-4 text-xs">
              {wait[channel] > 0
                ? <span className="text-gray-400">{fill(t('ver.resendIn'), { s: wait[channel] })}</span>
                : <button type="button" onClick={() => resend(channel)} disabled={busy === channel} className="text-teal-700 font-semibold hover:underline">{t('ver.resend')}</button>}
              {channel === 'PHONE' && !editingPhone && (
                <button type="button" onClick={() => { setEditingPhone(true); setNewPhone(''); }} className="text-gray-500 hover:underline">{t('ver.changePhone')}</button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {box('PHONE')}
      {box('EMAIL')}
      {me.emailVerified && me.phoneVerified && <><Confetti count={18} /><p className="text-center font-bold text-teal-700 pt-2 animate-[pop_0.4s_ease-out]">{t('ver.allSet')}</p></>}
    </div>
  );
}
