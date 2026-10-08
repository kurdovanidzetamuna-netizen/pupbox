'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { API_URL } from '@/lib/api';

/** Asks for a reset link. Says the same thing whether or not the account exists. */
export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setError(t('login.e.email')); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: value }) });
      if (res.status === 429) throw new Error(t('co.e.generic'));
      setSentTo(value);
    } catch (e: any) {
      setError(e.message || t('co.e.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-md shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('fp.heading')}</h1>
        {sentTo ? (
          <p className="text-sm text-gray-600 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 mt-4" role="status">{fill(t('fp.sent'), { email: sentTo })}</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">{t('fp.sub')}</p>
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t('login.email')}</label>
                <input id="email" type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${error ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} placeholder="you@example.com" />
                {error && <p className="text-red-500 text-xs mt-1" role="alert">⚠ {error}</p>}
              </div>
              <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-50">
                {loading ? t('fp.sending') : t('fp.btn')}
              </button>
            </form>
          </>
        )}
        <p className="text-center text-sm mt-6"><Link href="/login" className="text-teal-600 font-medium hover:underline">{t('fp.back')}</Link></p>
      </div>
    </main>
  );
}
