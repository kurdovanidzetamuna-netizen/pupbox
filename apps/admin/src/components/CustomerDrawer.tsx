'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SIZE: Record<string, string> = { EXTRA_SMALL: 'XS', SMALL: 'S', MEDIUM: 'M', LARGE: 'L', EXTRA_LARGE: 'XL' };
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function age(birthday?: string | null) {
  if (!birthday) return null;
  const years = (Date.now() - new Date(birthday).getTime()) / (365.25 * 86400_000);
  return years < 1 ? `${Math.max(1, Math.round(years * 12))} mo` : `${Math.floor(years)} y`;
}

const badge = (ok: boolean, yes: string, no: string) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: ok ? 'var(--green-50)' : 'var(--amber-50)', color: ok ? 'var(--green-800)' : 'var(--amber-700)' }}>{ok ? `✓ ${yes}` : no}</span>
);

/**
 * One customer in full, as a side panel: contact and consent, their dogs
 * (photo and everything they told us), plans, recent orders and addresses.
 */
export default function CustomerDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [c, setC] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setC(null); setError('');
    fetch(`${API}/admin/customers/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } })
      .then(async (r) => (r.ok ? setC(await r.json()) : setError(r.status === 403 ? 'Your role doesn’t allow this.' : 'Could not load this customer.')))
      .catch(() => setError('Could not load this customer.'));
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const h = (t: string) => <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '22px 0 10px' }}>{t}</h3>;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.35)' }} />
      <aside role="dialog" aria-label="Customer" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(560px, 100vw)', background: 'var(--white)', boxShadow: '-12px 0 40px rgba(0,0,0,0.15)', overflowY: 'auto', padding: '22px 26px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Customer</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 24, color: 'var(--slate-400)', cursor: 'pointer' }}>&times;</button>
        </div>
        {error && <p style={{ color: 'var(--red-600)', fontSize: 13 }}>{error}</p>}
        {!c && !error && <p style={{ color: 'var(--slate-400)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Loading…</p>}
        {c && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--slate-900)', margin: '4px 0 2px' }}>{c.firstName} {c.lastName}</h2>
            <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: 0 }}>{c.email} · {c.phone || 'no phone'}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {badge(c.emailVerified, 'Email confirmed', 'Email not confirmed')}
              {badge(c.phoneVerified, 'Phone confirmed', 'Phone not confirmed')}
              {badge(c.marketingEmail, `Email offers${c.marketingEmailAt ? ` since ${day(c.marketingEmailAt)}` : ''}`, 'No email offers')}
              {badge(c.marketingSms, `SMS offers${c.marketingSmsAt ? ` since ${day(c.marketingSmsAt)}` : ''}`, 'No SMS offers')}
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--slate-100)', color: 'var(--slate-600)' }}>{c.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
              {[['Paid', `₾${c.totalPaid.toFixed(2)}`], ['Orders', c.orders.length], ['Plans', c.subscriptions.length], ['Referred', c.referrals]].map(([k, v]) => (
                <div key={k as string} style={{ background: 'var(--slate-50)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>{k}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--slate-900)' }}>{v}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 10 }}>Joined {day(c.createdAt)} · writes in {c.language === 'en' ? 'English' : 'Georgian'} · referral code <code>{c.referralCode}</code></p>

            {h(`Dogs (${c.dogs.length})`)}
            {c.dogs.length === 0 && <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>No dogs added yet.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {c.dogs.map((d: any) => (
                <div key={d.id} style={{ display: 'flex', gap: 14, border: '1px solid var(--slate-200b)', borderRadius: 14, padding: 12 }}>
                  <div style={{ width: 84, height: 84, borderRadius: 12, overflow: 'hidden', background: 'var(--teal-50)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {d.photoUrl ? <a href={d.photoUrl} target="_blank" rel="noreferrer"><img src={d.photoUrl} alt={d.name} style={{ width: 84, height: 84, objectFit: 'cover' }} /></a> : '🐶'}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--slate-600)', minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-900)' }}>
                      {d.name}{d.size && <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--slate-100)', borderRadius: 5, padding: '1px 5px' }}>{SIZE[d.size]}</span>}
                      {d.forGift && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--amber-700)' }}>🎁 gift dog</span>}
                    </div>
                    <div>{[d.breed, d.gender?.toLowerCase(), age(d.birthday), d.weightKg ? `${d.weightKg} kg` : null].filter(Boolean).join(' · ') || '—'}</div>
                    {d.birthday && <div>🎂 {day(d.birthday)}</div>}
                    <div style={{ color: d.allergies?.length ? 'var(--red-600)' : 'var(--slate-400)', fontWeight: d.allergies?.length ? 700 : 400 }}>{d.allergies?.length ? `⚠ Allergic: ${d.allergies.join(', ')}` : 'No allergies'}</div>
                    {d.foodPreferences?.length > 0 && <div>Food: {d.foodPreferences.join(', ')}</div>}
                    {d.toyPreferences?.length > 0 && <div>Toys: {d.toyPreferences.join(', ')}</div>}
                    {d.chewingStrength && <div>Chewer: {d.chewingStrength.toLowerCase()}</div>}
                    {d.specialNotes && <div style={{ fontStyle: 'italic' }}>“{d.specialNotes}”</div>}
                    <div style={{ color: 'var(--slate-400)', fontSize: 11, marginTop: 2 }}>Added {day(d.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>

            {h(`Plans (${c.subscriptions.length})`)}
            {c.subscriptions.map((s: any) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--slate-100)' }}>
                <span>{s.isGift && '🎁 '}{s.plan?.name} {s.dog?.name && <span style={{ color: 'var(--slate-400)' }}>· {s.dog.name}</span>}</span>
                <span style={{ color: 'var(--slate-500)' }}>{s.status}{s.cancelledAt ? ' (cancelled)' : ''} · {s.boxesDelivered}/{s.boxesTotal} boxes · ends {day(s.endDate)}</span>
              </div>
            ))}

            {h('Recent orders')}
            {c.orders.map((o: any) => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--slate-100)' }}>
                <a href={`/dashboard/orders?search=${o.id.slice(-8)}`} style={{ color: 'var(--teal-700)', fontFamily: 'monospace' }}>{o.id.slice(-8).toUpperCase()}</a>
                <span style={{ color: 'var(--slate-500)' }}>{o.type.toLowerCase()} · {o.status} · ₾{Number(o.total).toFixed(2)} · {day(o.createdAt)}</span>
              </div>
            ))}

            {h('Addresses')}
            {c.addresses.map((a: any) => (
              <p key={a.id} style={{ fontSize: 13, color: 'var(--slate-600)', margin: '0 0 6px' }}>{a.firstName} {a.lastName} · {a.phone} — {a.city}, {[a.addressLine1, a.addressLine2].filter(Boolean).join(', ')}{a.isDefault ? ' (default)' : ''}</p>
            ))}
          </>
        )}
      </aside>
    </div>
  );
}
