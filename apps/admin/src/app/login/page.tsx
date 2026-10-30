'use client';
import { useState } from 'react';
import { post, saveToken } from '@/lib/api';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await post('/admin/auth/login', { email, password }, 'Login failed');
      saveToken(data.token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Left panel */}
      <div style={{ width: '50%', background: 'linear-gradient(135deg, #0f172a 0%, #0c1a2e 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 56px', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: 80, left: 40, width: 280, height: 280, background: 'var(--teal-600)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.12, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 80, right: 40, width: 320, height: 320, background: 'var(--teal-600)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.08, pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{ width: 44, height: 44, background: 'var(--teal-600)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🐾</div>
          <span style={{ color: 'var(--white)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.3px' }}>Pupbox</span>
        </div>

        {/* Headline */}
        <div style={{ position: 'relative' }}>
          <h1 style={{ color: 'var(--white)', fontSize: 42, fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
            Manage your<br />dog box business<br />
            <span style={{ color: 'var(--teal-400)' }}>from one place.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, margin: 0, lineHeight: 1.6 }}>
            Orders, subscriptions, customers,<br />content — all in one admin.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 40, position: 'relative' }}>
          {[['1,240+', 'Happy dogs'], ['₾48k', 'Monthly revenue'], ['94%', 'Renewal rate']].map(([v, l]) => (
            <div key={l}>
              <p style={{ color: 'var(--white)', fontWeight: 800, fontSize: 24, margin: '0 0 2px', letterSpacing: '-0.5px' }}>{v}</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)', padding: '48px 32px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div style={{ width: 36, height: 36, background: 'var(--teal-600)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🐾</div>
            <span style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: 15 }}>Pupbox Admin</span>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 6px', letterSpacing: '-0.4px' }}>Welcome back</h2>
          <p style={{ fontSize: 14, color: 'var(--slate-400)', margin: '0 0 32px' }}>Sign in to your admin account</p>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--red-50)', border: '1px solid var(--red-200)', color: 'var(--red-600)', fontSize: 13, padding: '10px 14px', borderRadius: 10, marginBottom: 20 }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700b)', marginBottom: 6 }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@pupbox.ge"
                style={{ width: '100%', border: '1px solid var(--slate-200)', borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none', background: 'var(--slate-50)', boxSizing: 'border-box', color: 'var(--slate-900)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--teal-600)')}
                onBlur={e => (e.target.style.borderColor = 'var(--slate-200)')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700b)', marginBottom: 6 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: '100%', border: '1px solid var(--slate-200)', borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none', background: 'var(--slate-50)', boxSizing: 'border-box', color: 'var(--slate-900)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--teal-600)')}
                onBlur={e => (e.target.style.borderColor = 'var(--slate-200)')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ background: loading ? 'var(--teal-200)' : 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'var(--white)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: 32, fontSize: 12, color: 'var(--slate-300)', textAlign: 'center' }}>
            Pupbox Admin Panel · Authorized access only
          </p>
        </div>
      </div>
    </div>
  );
}
