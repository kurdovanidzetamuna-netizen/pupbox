'use client';
import { useEffect, useState } from 'react';
import Composer, { GROUPS } from './Composer';
import { ActionButton, StatCard, StatCards } from '@/components/Toolbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}`, 'Content-Type': 'application/json' });
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Messages to customers: news, offers, reminders. Each lands in the bell on
 * the site (both languages; each customer reads theirs) and, with push on,
 * pops up on the phones and computers that allowed it. An optional button
 * opens a page on the site or any https:// address.
 */
export default function MessagesPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const [pushReady, setPushReady] = useState(false);
  const [open, setOpen] = useState(false);

  const load = () => fetch(`${API}/admin/messages`, { headers: headers() }).then((r) => (r.ok ? r.json() : { items: [] })).then((d) => { setItems(d.items); setPushReady(!!d.pushReady); }).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const sent = items ?? [];
  const reached = sent.reduce((n, m) => n + m.recipients, 0);
  const read = sent.reduce((n, m) => n + m.read, 0);

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Send messages</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 0', maxWidth: 620 }}>News and offers to customers’ notification bell on the site — and, if they allowed it, as a push notification on their phone or computer.</p>
        </div>
        <ActionButton onClick={() => setOpen(true)}>＋ New message</ActionButton>
      </div>

      {!pushReady && items && <p style={{ fontSize: 12.5, color: 'var(--amber-700)', background: 'var(--amber-50)', borderRadius: 10, padding: '10px 14px', margin: '0 0 16px' }}>Push notifications aren’t set up on this server yet (VAPID keys). Messages still reach the bell on the site.</p>}

      <StatCards>
        <StatCard theme="slate" value={sent.length} label="Messages sent" />
        <StatCard theme="teal" value={reached} label="Customers reached" />
        <StatCard theme="blue" value={reached ? `${Math.round((read / reached) * 100)}%` : '—'} label="Opened in the bell" />
      </StatCards>

      <div style={{ marginTop: 16, background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden' }}>
        {items === null ? <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--slate-400)', fontSize: 13 }}>Loading…</p>
          : sent.length === 0 ? <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--slate-400)', fontSize: 13 }}>No messages yet. Send the first one with “New message”.</p>
          : sent.map((m) => (
            <div key={m.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--slate-100)', display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: 14 }}>{m.titleEn} <span style={{ color: 'var(--slate-400)', fontWeight: 500 }}>· {m.titleKa}</span></div>
                <div style={{ fontSize: 12.5, color: 'var(--slate-500)', marginTop: 2 }}>{m.bodyEn}</div>
                {m.link && <div style={{ fontSize: 12, marginTop: 4 }}><span style={{ fontWeight: 700, color: 'var(--teal-700)' }}>{m.ctaTextEn || 'Open'} →</span> <code style={{ color: 'var(--slate-400)' }}>{m.link}</code></div>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--slate-500)', textAlign: 'right' }}>
                <div>{when(m.createdAt)}{m.adminName ? ` · ${m.adminName}` : ''}</div>
                <div style={{ marginTop: 2 }}>{GROUPS.find((g) => g.value === m.audience?.group)?.label ?? (m.audience?.group === 'customers' ? 'Chosen customers' : '')}{m.audience?.tag ? ` “${m.audience.tag}”` : ''}</div>
                <div style={{ marginTop: 2, fontWeight: 700, color: 'var(--slate-700)' }}>{m.recipients} sent · {m.read} opened{m.push ? ` · push ${m.pushSent}` : ''}</div>
              </div>
            </div>
          ))}
      </div>

      <Composer open={open} onClose={() => setOpen(false)} onSent={() => { setOpen(false); load(); }} pushReady={pushReady} />
    </div>
  );
}

