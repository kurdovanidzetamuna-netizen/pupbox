'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const STATUS_COLORS: Record<string, { background: string; color: string; border: string }> = {
  ACTIVE:         { background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' },
  PENDING:        { background: 'var(--amber-50)', color: 'var(--amber-700)', border: '1px solid var(--amber-200)' },
  PAUSED:         { background: 'var(--blue-50)', color: 'var(--blue-700)', border: '1px solid var(--blue-200)' },
  CANCELLED:      { background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)' },
  EXPIRED:        { background: 'var(--slate-50)', color: 'var(--slate-500)', border: '1px solid var(--slate-200)' },
  PAYMENT_FAILED: { background: 'var(--red-50)', color: 'var(--red-800)', border: '1px solid var(--red-200)' },
};

// ── Confirm modal ──────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'relative', background: 'var(--white)', borderRadius: 16, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--slate-200b)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--slate-900)' }}>{title}</h3>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-500)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            No, keep it
          </button>
          <button onClick={onConfirm} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: confirmColor, color: 'var(--white)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail modal ───────────────────────────────────────────────────────────
function DetailModal({ sub, onClose, onAction }: {
  sub: any;
  onClose: () => void;
  onAction: (id: string, status: string) => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const sc = STATUS_COLORS[sub.status] || STATUS_COLORS.EXPIRED;
  const [confirm, setConfirm] = useState<null | { status: string; label: string; color: string; title: string; message: string }>(null);

  function requestAction(status: string) {
    const configs: Record<string, typeof confirm> = {
      PAUSED:    { status: 'PAUSED',    label: 'Yes, pause',   color: 'var(--blue-600)', title: 'Pause subscription?',   message: `Pause the subscription for ${sub.user?.firstName} ${sub.user?.lastName}? They won't be billed until resumed.` },
      CANCELLED: { status: 'CANCELLED', label: 'Yes, cancel',  color: 'var(--red-600)', title: 'Cancel subscription?',  message: `This will permanently cancel the subscription for ${sub.user?.firstName} ${sub.user?.lastName}. This cannot be undone.` },
      ACTIVE:    { status: 'ACTIVE',    label: 'Yes, resume',  color: 'var(--teal-600)', title: 'Resume subscription?',  message: `Resume the subscription for ${sub.user?.firstName} ${sub.user?.lastName}? Billing will restart on the next cycle.` },
    };
    setConfirm(configs[status] || null);
  }

  function handleConfirm() {
    if (!confirm) return;
    onAction(sub.id, confirm.status);
    setConfirm(null);
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'relative', background: 'var(--white)', borderRadius: 20, width: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', border: '1px solid var(--slate-200b)' }}>
        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--slate-900)' }}>
              {sub.user?.firstName} {sub.user?.lastName}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--slate-400)' }}>{sub.user?.email}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ ...sc, display: 'inline-flex', alignItems: 'center', padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{sub.status}</span>
            <button onClick={onClose} style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200b)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)', fontSize: 18 }}>×</button>
          </div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Plan */}
          <Section title="Plan">
            <Row label="Name" value={sub.plan?.name || '—'} />
            <Row label="Price" value={`₾${Number(sub.plan?.price ?? 0).toFixed(0)}`} />
            <Row label="Duration" value={sub.plan?.durationMonths ? `${sub.plan.durationMonths} month${sub.plan.durationMonths > 1 ? 's' : ''}` : '—'} />
            <Row label="Boxes" value={`${sub.boxesDelivered ?? 0} / ${sub.boxesTotal ?? 0} delivered`} />
          </Section>

          {/* Progress bar */}
          {sub.boxesTotal > 0 && (
            <div style={{ background: 'var(--slate-50)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--slate-400)' }}>
                <span>Box progress</span>
                <span>{Math.round((sub.boxesDelivered / sub.boxesTotal) * 100)}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--slate-200b)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--teal-600)', borderRadius: 999, width: `${Math.min(100, (sub.boxesDelivered / sub.boxesTotal) * 100)}%`, transition: 'width 0.4s' }} />
              </div>
            </div>
          )}

          {/* Dog */}
          {sub.dog && (
            <Section title="Dog">
              <Row label="Name" value={sub.dog.name} />
              {sub.dog.breed && <Row label="Breed" value={sub.dog.breed} />}
              {sub.dog.size && <Row label="Size" value={sub.dog.size} />}
            </Section>
          )}

          {/* Dates */}
          <Section title="Dates">
            <Row label="Started" value={sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
            <Row label="Next renewal" value={sub.nextRenewalAt ? new Date(sub.nextRenewalAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
            {sub.cancelReason && <Row label="Cancel reason" value={sub.cancelReason} />}
          </Section>
        </div>

        {/* Actions footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--slate-100)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {sub.status === 'PENDING' && (
            <button onClick={() => requestAction('ACTIVE')} style={actionBtn('var(--teal-600)')}>Activate</button>
          )}
          {sub.status === 'ACTIVE' && (
            <>
              <button onClick={() => requestAction('PAUSED')} style={actionBtn('var(--blue-600)')}>Pause</button>
              <button onClick={() => requestAction('CANCELLED')} style={actionBtn('var(--red-600)')}>Cancel</button>
            </>
          )}
          {sub.status === 'PAUSED' && (
            <button onClick={() => requestAction('ACTIVE')} style={actionBtn('var(--teal-600)')}>Resume</button>
          )}
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-500)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          confirmColor={confirm.color}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
      <div style={{ background: 'var(--slate-50)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--slate-100)' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--slate-100)' }}>
      <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-800)' }}>{value}</span>
    </div>
  );
}

function actionBtn(bg: string): React.CSSProperties {
  return { padding: '8px 18px', borderRadius: 10, border: 'none', background: bg, color: 'var(--white)', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [confirm, setConfirm] = useState<null | { id: string; status: string; label: string; color: string; title: string; message: string }>(null);

  async function load() {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const qs = status ? `?status=${status}` : '';
      const res = await fetch(`${API}/admin/subscriptions${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSubs(data.items || []);
        setTotal(data.total || 0);
      }
    } catch { } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status]);

  async function doUpdate(id: string, newStatus: string) {
    const token = localStorage.getItem('admin_token');
    await fetch(`${API}/admin/subscriptions/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  function requestAction(sub: any, newStatus: string, e: React.MouseEvent) {
    e.stopPropagation();
    const name = `${sub.user?.firstName} ${sub.user?.lastName}`;
    const configs: Record<string, typeof confirm> = {
      ACTIVE:    { id: sub.id, status: 'ACTIVE',    label: 'Yes, resume',  color: 'var(--teal-600)', title: 'Resume subscription?',  message: `Resume the subscription for ${name}? Billing will restart on the next cycle.` },
      PAUSED:    { id: sub.id, status: 'PAUSED',    label: 'Yes, pause',   color: 'var(--blue-600)', title: 'Pause subscription?',   message: `Pause the subscription for ${name}? They won't be billed until resumed.` },
      CANCELLED: { id: sub.id, status: 'CANCELLED', label: 'Yes, cancel',  color: 'var(--red-600)', title: 'Cancel subscription?',  message: `This will permanently cancel the subscription for ${name}. This cannot be undone.` },
    };
    setConfirm(configs[newStatus] || null);
  }

  const counts = {
    active:    subs.filter(s => s.status === 'ACTIVE').length,
    paused:    subs.filter(s => s.status === 'PAUSED').length,
    cancelled: subs.filter(s => s.status === 'CANCELLED').length,
  };

  const tabs = [
    { label: 'All',       val: '',          count: total },
    { label: 'Active',    val: 'ACTIVE',    count: counts.active },
    { label: 'Paused',    val: 'PAUSED',    count: counts.paused },
    { label: 'Cancelled', val: 'CANCELLED', count: counts.cancelled },
  ];

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Subscriptions</h1>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{total} subscriptions total</p>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.val}
            onClick={() => setStatus(t.val)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: status === t.val ? 'none' : '1px solid var(--slate-200)', background: status === t.val ? 'var(--slate-900)' : 'var(--white)', color: status === t.val ? 'var(--white)' : 'var(--slate-500)', transition: 'all 0.12s' }}
          >
            {t.label}
            <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: status === t.val ? 'rgba(255,255,255,0.2)' : 'var(--slate-100)', color: status === t.val ? 'var(--white)' : 'var(--slate-400)' }}>{t.count}</span>
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : subs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔄</div>
            <p style={{ fontSize: 13 }}>No subscriptions found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Customer', 'Plan', 'Dog', 'Status', 'Progress', 'Renewal', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const sc = STATUS_COLORS[s.status] || STATUS_COLORS.EXPIRED;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    style={{ borderBottom: '1px solid var(--slate-50)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <p style={{ fontWeight: 600, color: 'var(--slate-800)', margin: 0 }}>{s.user?.firstName} {s.user?.lastName}</p>
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>{s.user?.email}</p>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <p style={{ fontWeight: 600, color: 'var(--slate-800)', margin: 0 }}>{s.plan?.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>₾{Number(s.plan?.price ?? 0).toFixed(0)}</p>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--slate-500)' }}>{s.dog?.name || <span style={{ color: 'var(--slate-200)' }}>—</span>}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ ...sc, display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{s.status}</span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: 'var(--slate-100)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--teal-600)', borderRadius: 999, width: `${s.boxesTotal ? Math.min(100, (s.boxesDelivered / s.boxesTotal) * 100) : 0}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>{s.boxesDelivered}/{s.boxesTotal}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--slate-500)' }}>
                      {s.nextRenewalAt ? new Date(s.nextRenewalAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 18px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {s.status === 'PENDING' && (
                          <button onClick={e => requestAction(s, 'ACTIVE', e)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--green-50)', color: 'var(--green-800)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Activate</button>
                        )}
                        {s.status === 'ACTIVE' && (
                          <>
                            <button onClick={e => requestAction(s, 'PAUSED', e)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--blue-50)', color: 'var(--blue-700)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Pause</button>
                            <button onClick={e => requestAction(s, 'CANCELLED', e)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                          </>
                        )}
                        {s.status === 'PAUSED' && (
                          <button onClick={e => requestAction(s, 'ACTIVE', e)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'var(--green-50)', color: 'var(--green-800)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Resume</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          sub={selected}
          onClose={() => setSelected(null)}
          onAction={(id, status) => { doUpdate(id, status); setSelected(null); }}
        />
      )}

      {/* Confirm modal (from table row actions) */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          confirmColor={confirm.color}
          onConfirm={() => { doUpdate(confirm.id, confirm.status); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
