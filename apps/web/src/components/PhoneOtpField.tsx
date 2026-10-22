'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch } from '@/lib/authFetch';
import PhoneInput from '@/components/ui/PhoneInput';
import OtpInput from '@/components/ui/OtpInput';
import { FieldError } from '@/components/ui/FormError';
import { Icon } from '@/components/ui/icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const message = async (res: Response, fallback: string) => {
  const d = await res.json().catch(() => ({}));
  return (Array.isArray(d?.message) ? d.message[0] : d?.message) || fallback;
};

export type PhoneConfirmed = { phone: string; proof?: string };

/**
 * A phone number confirmed by SMS, right in the form: type the number →
 * "Send code" → six boxes for the code (it checks itself once all six are
 * in) → a green "Verified". Editing the number afterwards starts over.
 *
 * mode "signup": no account yet; a right code gives a proof the sign-up
 *   sends along, so the account starts with its phone confirmed.
 * mode "change": signed in; a right code makes this the account's number.
 */
export default function PhoneOtpField({ id, label, value, onChange, onConfirmed, mode, error, autoFocus, floatLabel = true, confirmed = false }: {
  id: string;
  label: string;
  value: string;
  onChange: (phone: string, valid: boolean) => void;
  /** The confirmed number (and sign-up proof), or null when it isn't confirmed (any more). */
  onConfirmed: (c: PhoneConfirmed | null) => void;
  mode: 'signup' | 'change';
  error?: string;
  autoFocus?: boolean;
  floatLabel?: boolean;
  /** Already confirmed (coming back to the form): start as verified. */
  confirmed?: boolean;
}) {
  const { t, lang } = useLanguage();
  const [valid, setValid] = useState(false);
  const [stage, setStage] = useState<'idle' | 'sent' | 'done'>(confirmed ? 'done' : 'idle');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const base = mode === 'signup' ? '/auth/phone' : '/auth/phone/change';
  const call = (path: string, body: object) => (mode === 'signup'
    ? fetch(`${API_URL}${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    : authFetch(`${base}${path}`, { method: 'POST', body: JSON.stringify(body) }));

  async function send() {
    if (!valid) { setErr(t(value ? 'reg.e.phone' : 'ui.e.phone')); return; }
    setBusy(true); setErr('');
    try {
      const res = await call('/send', { phone: value, language: lang });
      if (!res.ok) throw new Error(await message(res, t('co.e.generic')));
      const d = await res.json();
      setSentTo(d.to || value); setStage('sent'); setCode(''); setWait(d.resendIn ?? 60);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function check(typed: string) {
    setBusy(true); setErr('');
    try {
      const res = await call('/verify', { phone: value, code: typed });
      if (!res.ok) throw new Error(await message(res, t('co.e.generic')));
      const d = await res.json();
      setStage('done');
      onConfirmed({ phone: d.phone || value, proof: d.proof });
    } catch (e: any) { setErr(e.message); setCode(''); }
    finally { setBusy(false); }
  }

  // A changed number isn't the confirmed one any more.
  function edit(v: string, ok: boolean) {
    setValid(ok);
    if (stage !== 'idle') { setStage('idle'); setCode(''); setErr(''); onConfirmed(null); }
    onChange(v, ok);
  }

  // Verified: a small badge in the field. The "Send code" button sits under
  // the field, so the number keeps its full width on a phone.
  const badge = stage === 'done' ? (
    <span className="mr-2.5 w-7 h-7 rounded-full bg-teal-600 text-white inline-flex items-center justify-center motion-safe:animate-[pop_0.3s_ease-out]" aria-label={t('otp.verified')} title={t('otp.verified')}>
      <Icon name="check" className="w-4 h-4" strokeWidth={3} />
    </span>
  ) : null;

  return (
    <div>
      <PhoneInput id={id} label={label} value={value} required error={error || (stage === 'idle' ? err : '')} floatLabel={floatLabel} autoFocus={autoFocus}
        trailing={badge} onChange={edit} />
      {stage === 'idle' && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="px-1 text-[11.5px] text-gray-500 leading-snug">{!error && !err ? t('otp.hint') : ''}</p>
          <button type="button" onClick={send} disabled={busy}
            className="shrink-0 h-9 px-4 rounded-full bg-teal-600 text-white text-[12.5px] font-bold hover:bg-teal-700 disabled:opacity-60 whitespace-nowrap inline-flex items-center gap-1.5">
            <Icon name="chat" className="w-4 h-4" />{busy ? '…' : t('otp.send')}
          </button>
        </div>
      )}

      {stage === 'done' && (
        <p className="mt-1 px-1 text-[11.5px] font-semibold text-teal-700 flex items-center gap-1" role="status">
          <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3} />{t('otp.confirmedLine')}
        </p>
      )}

      {stage === 'sent' && (
        <div className="mt-3 rounded-[18px] bg-teal-50/60 ring-1 ring-teal-100 p-3.5 motion-safe:animate-[fadeUp_0.2s_ease-out]">
          <p className="text-[12.5px] text-gray-700 mb-2.5 flex items-center gap-1.5">
            <Icon name="chat" className="w-4 h-4 text-teal-600" />{fill(t('ver.phone'), { to: sentTo })}
          </p>
          <OtpInput value={code} onChange={(v) => { setCode(v); setErr(''); }} onComplete={check} disabled={busy} error={!!err} label={t('ver.code')} />
          {err && <FieldError message={err} />}
          <div className="mt-2.5 flex items-center gap-4 text-[12px]">
            {wait > 0
              ? <span className="text-gray-400">{fill(t('ver.resendIn'), { s: wait })}</span>
              : <button type="button" onClick={send} disabled={busy} className="font-semibold text-teal-700 hover:underline">{t('ver.resend')}</button>}
            {busy && <span className="text-gray-400">{t('otp.checking')}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
