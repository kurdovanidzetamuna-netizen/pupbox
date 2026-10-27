'use client';
import { useEffect, useState } from 'react';
import DogLikes from './DogLikes';
import Composer from '@/app/dashboard/messages/Composer';

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

const gel = (n: number) => `₾${Number(n).toFixed(2).replace(/\.00$/, '')}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}`, 'Content-Type': 'application/json' });

/**
 * One customer in full, as a side panel: contact and consent, money, the
 * team's tags and notes, their dogs (photo and everything they told us),
 * plans, saved cards, referrals, promo codes, recent orders and addresses.
 */
export default function CustomerDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged?: () => void }) {
  const [c, setC] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [writing, setWriting] = useState(false);
  const [pushReady, setPushReady] = useState(false);
  useEffect(() => { fetch(`${API}/me/push/key`).then((r) => r.json()).then((d) => setPushReady(!!d.enabled)).catch(() => {}); }, []);

  async function saveTags(tags: string[]) {
    const r = await fetch(`${API}/admin/customers/${id}/tags`, { method: 'PATCH', headers: auth(), body: JSON.stringify({ tags }) });
    if (r.ok) { const d = await r.json(); setC((x: any) => ({ ...x, tags: d.crmTags })); onChanged?.(); }
    else setNote('Tags not saved — your role may not allow it.');
  }
  async function addNote() {
    if (!draft.trim()) return;
    setBusy('note');
    const r = await fetch(`${API}/admin/customers/${id}/notes`, { method: 'POST', headers: auth(), body: JSON.stringify({ body: draft.trim() }) });
    setBusy('');
    if (r.ok) { const n = await r.json(); setC((x: any) => ({ ...x, notes: [n, ...x.notes] })); setDraft(''); }
    else setNote('Note not saved — your role may not allow it.');
  }
  async function deleteNote(noteId: string) {
    if (!confirm('Delete this note?')) return;
    const r = await fetch(`${API}/admin/customers/${id}/notes/${noteId}`, { method: 'DELETE', headers: auth() });
    if (r.ok) setC((x: any) => ({ ...x, notes: x.notes.filter((n: any) => n.id !== noteId) }));
  }

  // Confirm (or un-confirm) a phone or email by hand; kept in the audit log.
  async function setVerified(channel: 'PHONE' | 'EMAIL', verified: boolean) {
    if (!verified && !confirm(`Remove the ${channel === 'PHONE' ? 'phone' : 'email'} confirmation? The customer will be asked to confirm it again.`)) return;
    setBusy(channel); setNote('');
    const r = await fetch(`${API}/admin/customers/${id}/verify`, { method: 'PATCH', headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ channel, verified }) });
    const d = await r.json().catch(() => ({}));
    setBusy('');
    if (!r.ok) { setNote((Array.isArray(d.message) ? d.message[0] : d.message) || 'Not saved.'); return; }
    setC((x: any) => ({ ...x, ...d }));
    setNote(verified ? `✓ ${channel === 'PHONE' ? 'Phone' : 'Email'} marked as confirmed` : 'Confirmation removed');
  }

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
            <button type="button" onClick={() => setWriting(true)} style={{ marginTop: 10, padding: '7px 13px', borderRadius: 10, border: 'none', background: 'var(--teal-50)', color: 'var(--teal-700)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>🔔 Send message</button>
            <Composer open={writing} onClose={() => setWriting(false)} onSent={() => { setWriting(false); setNote('✓ Message sent'); }} pushReady={pushReady} ids={[c.id]} who={[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email} />
            {/* Phone and email: confirmed or not, when and how — and a button to change it by hand */}
            <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
              {([
                ['PHONE', '📱 Phone', c.phone || 'no phone', c.phoneVerified, c.phoneVerified ? `${c.phoneVerifiedVia === 'ADMIN' ? 'by admin' : 'by SMS code'}${c.phoneVerifiedAt ? ` · ${day(c.phoneVerifiedAt)}` : ''}` : 'not confirmed'],
                ['EMAIL', '✉️ Email', c.email, c.emailVerified, c.emailVerified ? 'confirmed' : 'not confirmed'],
              ] as const).map(([ch, label, value, ok, how]) => (
                <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: ok ? 'var(--green-50)' : 'var(--amber-50)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-500)' }}>{label}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--slate-900)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: ok ? 'var(--green-800)' : 'var(--amber-700)' }}>{ok ? '✓ ' : '• '}{how}</div>
                  </div>
                  {(ch === 'EMAIL' || c.phone) && (
                    <button onClick={() => setVerified(ch, !ok)} disabled={!!busy}
                      style={{ flexShrink: 0, padding: '7px 11px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                        border: ok ? '1px solid var(--slate-200)' : 'none', background: ok ? 'var(--white)' : 'var(--teal-600)', color: ok ? 'var(--slate-600)' : 'var(--white)' }}>
                      {busy === ch ? '…' : ok ? 'Un-verify' : 'Mark verified'}
                    </button>
                  )}
                </div>
              ))}
              {note && <p role="status" style={{ margin: 0, fontSize: 12.5, color: note.startsWith('✓') || note.startsWith('Confirmation') ? 'var(--teal-700)' : 'var(--red-600)' }}>{note}</p>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {badge(c.marketingEmail, `Email offers${c.marketingEmailAt ? ` since ${day(c.marketingEmailAt)}` : ''}`, 'No email offers')}
              {badge(c.marketingSms, `SMS offers${c.marketingSmsAt ? ` since ${day(c.marketingSmsAt)}` : ''}`, 'No SMS offers')}
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--slate-100)', color: 'var(--slate-600)' }}>{c.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: 8, marginTop: 16 }}>
              {[['Spent', gel(c.totalPaid)], ['Paid orders', c.paidOrders], ['Average order', gel(c.averageOrder)], ['Refunded', gel(c.refunded)], ['Last order', day(c.lastOrderAt)], ['Last sign-in', day(c.lastLoginAt)]].map(([k, v]) => (
                <div key={k as string} style={{ background: 'var(--slate-50)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>{k}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--slate-900)' }}>{v}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 10 }}>Joined {day(c.createdAt)} · writes in {c.language === 'en' ? 'English' : 'Georgian'} · referral code <code>{c.referralCode}</code>{c.pushDevices > 0 ? ` · push on ${c.pushDevices} device${c.pushDevices === 1 ? '' : 's'}` : ''}</p>

            {h('Tags')}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {c.tags.map((t: string) => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--teal-50)', borderRadius: 999, padding: '3px 6px 3px 10px' }}>
                  {t}<button type="button" aria-label={`Remove tag ${t}`} onClick={() => saveTags(c.tags.filter((x: string) => x !== t))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--teal-700)', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
                </span>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); const t = tagDraft.trim(); if (t && !c.tags.includes(t)) saveTags([...c.tags, t]); setTagDraft(''); }} style={{ display: 'inline-flex' }}>
                <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} maxLength={30} placeholder="+ Add tag (VIP, wholesale…)" aria-label="Add tag"
                  style={{ width: 190, padding: '5px 10px', fontSize: 12, border: '1px dashed var(--slate-300)', borderRadius: 999, outline: 'none', background: 'var(--white)', color: 'var(--slate-900)' }} />
              </form>
            </div>

            {h(`Team notes (${c.notes.length})`)}
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={2000} placeholder="A call, a wish, a complaint… only the team sees this." aria-label="New note"
                style={{ flex: 1, padding: '8px 10px', fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 10, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: 'var(--white)', color: 'var(--slate-900)' }} />
              <button type="button" onClick={addNote} disabled={!draft.trim() || busy === 'note'} style={{ alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 10, border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', background: draft.trim() ? 'var(--teal-600)' : 'var(--slate-200)', color: draft.trim() ? 'var(--white)' : 'var(--slate-400)' }}>{busy === 'note' ? '…' : 'Add'}</button>
            </div>
            {c.notes.map((n: any) => (
              <div key={n.id} style={{ marginTop: 8, padding: '9px 12px', borderRadius: 10, background: 'var(--slate-50)', fontSize: 13, color: 'var(--slate-700)' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{n.body}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--slate-400)' }}>
                  <span>{n.adminName || 'Team'} · {day(n.createdAt)}</span>
                  <button type="button" onClick={() => deleteNote(n.id)} style={{ border: 'none', background: 'none', color: 'var(--red-600)', fontSize: 11, cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            ))}

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
                    <div><DogLikes dog={d} /></div>
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

            {h(`Saved cards (${c.savedCards.length})`)}
            {c.savedCards.length === 0 && <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>No saved cards — renewals are paid by link.</p>}
            {c.savedCards.map((k: any) => (
              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--slate-100)' }}>
                <span>💳 {k.brand} •••• {k.last4}{k.isDefault && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--teal-700)', fontWeight: 700 }}>main</span>}</span>
                <span style={{ color: 'var(--slate-500)' }}>expires {String(k.expMonth).padStart(2, '0')}/{k.expYear} · saved {day(k.createdAt)}</span>
              </div>
            ))}

            {h('Referrals')}
            <p style={{ fontSize: 13, color: 'var(--slate-600)', margin: '0 0 6px' }}>
              {c.invitedBy ? <>Invited by <b>{[c.invitedBy.firstName, c.invitedBy.lastName].filter(Boolean).join(' ') || c.invitedBy.email}</b> ({c.invitedBy.email})</> : 'Came on their own (no friend code).'}
            </p>
            {c.referralsSent.length === 0 ? <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>Hasn’t invited anyone yet.</p> : c.referralsSent.map((r: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--slate-100)' }}>
                <span>{r.invited ? ([r.invited.firstName, r.invited.lastName].filter(Boolean).join(' ') || r.invited.email) : 'Not signed up yet'}</span>
                <span style={{ color: 'var(--slate-500)' }}>{r.status.replace(/_/g, ' ').toLowerCase()}{r.rewardValue != null ? ` · 🎁 ${gel(r.rewardValue)}` : ''} · {day(r.createdAt)}</span>
              </div>
            ))}

            {h(`Promo codes used (${c.promoCodes.length})`)}
            {c.promoCodes.length === 0 && <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>None yet.</p>}
            {c.promoCodes.map((u: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--slate-100)' }}>
                <code style={{ fontWeight: 700 }}>{u.code}</code>
                <span style={{ color: 'var(--slate-500)' }}>−{gel(u.discount)} · {u.orderId ? <a href={`/dashboard/orders?search=${u.orderId.slice(-8)}`} style={{ color: 'var(--teal-700)' }}>{u.orderId.slice(-8).toUpperCase()}</a> : '—'} · {day(u.usedAt)}</span>
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
              <p key={a.id} style={{ fontSize: 13, color: 'var(--slate-600)', margin: '0 0 6px' }}>{a.firstName} {a.lastName} · {a.phone} — {a.city}, {[a.addressLine1, a.addressLine2].filter(Boolean).join(', ')}{a.isDefault ? ' (default)' : ''}{a.isGift && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet-700)', background: 'var(--violet-50)', borderRadius: 99, padding: '1px 7px', marginLeft: 6 }}>🎁 {(a.label || 'Gift').replace(/^Gift · /, 'Gift for ')}</span>}</p>
            ))}
          </>
        )}
      </aside>
    </div>
  );
}
