'use client';
import Link from 'next/link';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { safeRedirect } from '@/lib/safeRedirect';
import LegalNotice from '@/components/LegalNotice';
import { API_URL } from '@/lib/api';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const { refresh: refreshCart } = useCart();
  const refCode = params.get('ref') || '';
  const { t } = useLanguage();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', referralCode: refCode });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, referralCode: form.referralCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      localStorage.setItem('pupbox_token', data.token);
      await refreshCart(); // merges anything added as a guest into the account cart
      router.push(redirect);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="text-3xl font-bold text-teal-600 mb-8">🐾 Pupbox</Link>
      <div className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-md shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('register.heading')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('register.subheading')}</p>
        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.firstName')} <span className="text-red-500">*</span></label>
              <input value={form.firstName} onChange={e => { setForm({ ...form, firstName: e.target.value }); setFieldErrors(f => ({ ...f, firstName: '' })); }} className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${fieldErrors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} placeholder="Anna" />
              {fieldErrors.firstName && <p className="text-red-500 text-xs mt-1">⚠ {fieldErrors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.lastName')} <span className="text-red-500">*</span></label>
              <input value={form.lastName} onChange={e => { setForm({ ...form, lastName: e.target.value }); setFieldErrors(f => ({ ...f, lastName: '' })); }} className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${fieldErrors.lastName ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} placeholder="Kvaratskhelia" />
              {fieldErrors.lastName && <p className="text-red-500 text-xs mt-1">⚠ {fieldErrors.lastName}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.email')} <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setFieldErrors(f => ({ ...f, email: '' })); }} className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} placeholder="anna@example.com" />
            {fieldErrors.email && <p className="text-red-500 text-xs mt-1">⚠ {fieldErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.phone')}</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="+995 599 123 456" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')} <span className="text-red-500">*</span></label>
            <input type="password" value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); setFieldErrors(f => ({ ...f, password: '' })); }} className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} placeholder="••••••••" />
            {fieldErrors.password && <p className="text-red-500 text-xs mt-1">⚠ {fieldErrors.password}</p>}
          </div>
          {form.referralCode && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm text-green-700">
              🎁 {t('register.referral')}: <strong>{form.referralCode}</strong>
            </div>
          )}
          {!form.referralCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.referral')}</label>
              <input value={form.referralCode} onChange={e => setForm({ ...form, referralCode: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          )}
          <LegalNotice />
          <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-50">
            {loading ? t('register.loading') : t('register.btn')}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          {t('register.haveAccount')}{' '}
          <Link href="/login" className="text-teal-600 font-medium hover:underline">{t('register.signIn')}</Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
