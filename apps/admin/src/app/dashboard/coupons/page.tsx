'use client';
import UsedOn from './UsedOn';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import FriendCodes from './FriendCodes';
import SideDrawer from '@/components/SideDrawer';
import NumberField from '@/components/NumberField';
import DateField, { inDays, showDate, todayIso } from '@/components/DateField';
import ConfirmSheet, { Toast } from '../orders/_components/ConfirmSheet';
import { del, download, getOr, patch, post, today } from '@/lib/api';


/** What a promo code can take money off: any mix of these. */
const SCOPES = [
  { key: 'SHOP', label: 'Shop', icon: '🛍️', long: 'shop products' },
  { key: 'BOX', label: 'Box plans', icon: '📦', long: 'box plans' },
  { key: 'CUSTOM_BOX', label: 'Built boxes', icon: '🧩', long: 'built boxes' },
  { key: 'GIFT', label: 'Gift boxes', icon: '🎁', long: 'gift boxes' },
  { key: 'DELIVERY', label: 'Delivery', icon: '🚚', long: 'delivery' },
];
const ALL = SCOPES.map((s) => s.key);

type Status = 'active' | 'scheduled' | 'paused' | 'expired' | 'usedUp' | 'stopped';
const STATUS: Record<Status, { label: string; bg: string; fg: string }> = {
  active: { label: 'Active', bg: 'var(--green-50)', fg: 'var(--green-800)' },
  scheduled: { label: 'Scheduled', bg: 'var(--blue-50)', fg: 'var(--blue-700, #1d4ed8)' },
  paused: { label: 'Paused', bg: 'var(--amber-50)', fg: 'var(--amber-700)' },
  expired: { label: 'Expired', bg: 'var(--slate-100)', fg: 'var(--slate-500)' },
  usedUp: { label: 'Used up', bg: 'var(--slate-100)', fg: 'var(--slate-500)' },
  stopped: { label: 'Stopped', bg: 'var(--red-50)', fg: 'var(--red-700)' },
};
function statusOf(c: any): Status {
  const now = Date.now();
  if (c.stoppedAt) return 'stopped';
  if (!c.isActive) return 'paused';
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return 'expired';
  if (c.usageLimit && c.usedCount >= c.usageLimit) return 'usedUp';
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return 'scheduled';
  return 'active';
}
const TABS: { key: string; label: string; has: (s: Status) => boolean }[] = [
  { key: 'all', label: 'All', has: () => true },
  { key: 'active', label: 'Active', has: (s) => s === 'active' },
  { key: 'scheduled', label: 'Scheduled', has: (s) => s === 'scheduled' },
  { key: 'paused', label: 'Paused', has: (s) => s === 'paused' },
  { key: 'ended', label: 'Ended', has: (s) => s === 'expired' || s === 'usedUp' },
  { key: 'stopped', label: 'Stopped', has: (s) => s === 'stopped' },
];

const EMPTY = {
  code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', maxDiscount: '',
  scopes: ['SHOP', 'BOX', 'CUSTOM_BOX', 'GIFT'] as string[], boxTierIds: [] as string[], minPlanMonths: '',
  minOrderAmount: '', firstOrderOnly: false, usageLimit: '', perUserLimit: '1', startsAt: '', expiresAt: '',
};
type Form = typeof EMPTY;

const gel = (n: any) => `₾${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const num = (v: string) => (v === '' ? null : Number(v));
const day = (d?: string | null) => (d ? d.slice(0, 10) : '');
/** PUP-7KX2: easy to read aloud (no 0/O or 1/I). */
const randomCode = () => `PUP-${Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')}`;
const endOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()}`; };

function toForm(c: any): Form {
  const s = (v: any) => (v === null || v === undefined ? '' : String(Number(v)));
  return {
    code: c.code, description: c.description ?? '', discountType: c.discountType, discountValue: s(c.discountValue), maxDiscount: s(c.maxDiscount),
    scopes: c.scopes ?? [], boxTierIds: c.boxTierIds ?? [], minPlanMonths: s(c.minPlanMonths), minOrderAmount: s(c.minOrderAmount),
    firstOrderOnly: !!c.firstOrderOnly, usageLimit: s(c.usageLimit), perUserLimit: s(c.perUserLimit), startsAt: day(c.startsAt), expiresAt: day(c.expiresAt),
  };
}

/** The code in one sentence, as the customer gets it. */
function inShort(f: Form, tiers: any[]) {
  const v = Number(f.discountValue) || 0;
  const onlyDelivery = f.scopes.length === 1 && f.scopes[0] === 'DELIVERY';
  const what = ALL.every((k) => f.scopes.includes(k)) ? 'everything, delivery included'
    : SCOPES.filter((s) => f.scopes.includes(s.key)).map((s) => s.long).join(', ').replace(/, ([^,]*)$/, ' and $1');
  const parts = [onlyDelivery && f.discountType === 'PERCENTAGE' && v >= 100 ? 'Free delivery' : `${f.discountType === 'PERCENTAGE' ? `${v}%` : gel(v)} off ${what}`];
  if (f.discountType === 'PERCENTAGE' && Number(f.maxDiscount) > 0) parts[0] += ` (up to ${gel(f.maxDiscount)})`;
  const boxy = f.scopes.includes('BOX') || f.scopes.includes('GIFT');
  if (boxy && f.boxTierIds.length) parts.push(`${tiers.filter((t) => f.boxTierIds.includes(t.id)).map((t) => t.name).join(' / ')} boxes only`);
  if (boxy && Number(f.minPlanMonths) > 1) parts.push(`plans of ${f.minPlanMonths}+ months`);
  if (Number(f.minOrderAmount) > 0) parts.push(`orders from ${gel(f.minOrderAmount)}`);
  if (f.firstOrderOnly) parts.push('first order only');
  parts.push(f.perUserLimit ? `${f.perUserLimit === '1' ? 'once' : `${f.perUserLimit}×`} per customer` : 'no limit per customer');
  if (f.usageLimit) parts.push(`${f.usageLimit} uses in total`);
  return parts.join(' · ');
}

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [lengths, setLengths] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<any | 'new' | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [start, setStart] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState<'stop' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const d = await getOr<any>('/admin/coupons', []);
    setCodes(Array.isArray(d) ? d : []);
    setLoading(false);
    return Array.isArray(d) ? d : [];
  }
  useEffect(() => {
    load();
    getOr<any>('/admin/box-tiers', []).then((t) => Array.isArray(t) && setTiers(t));
    // The plan lengths on sale (1, 3, 6, 12 months) for the "plans from" choice.
    getOr<any[]>('/subscription-plans', []).then((p) => {
      const months = (x: any) => (x.durationUnit === 'YEAR' ? x.durationValue * 12 : x.durationUnit === 'MONTH' ? x.durationValue : 0);
      setLengths([...new Set((Array.isArray(p) ? p : []).map(months).filter((m) => m > 1))].sort((a, b) => a - b));
    });
  }, []);

  const withStatus = useMemo(() => codes.map((c) => ({ ...c, status: statusOf(c) })), [codes]);
  const shown = withStatus.filter((c) => TABS.find((t) => t.key === tab)!.has(c.status) && (!q.trim() || `${c.code} ${c.description ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())));
  const totals = useMemo(() => ({
    active: withStatus.filter((c) => c.status === 'active').length,
    uses: withStatus.reduce((n, c) => n + (c.stats?.orders ?? 0), 0),
    discount: withStatus.reduce((n, c) => n + (c.stats?.discount ?? 0), 0),
    sales: withStatus.reduce((n, c) => n + (c.stats?.sales ?? 0), 0),
  }), [withStatus]);

  const isNew = editing === 'new';
  const current = !isNew && editing ? withStatus.find((c) => c.id === editing.id) ?? editing : null;
  const stopped = !!current?.stoppedAt;
  const used = !!current && (current.usedCount > 0 || current.stats?.orders > 0);
  const dirty = !!editing && JSON.stringify(form) !== start;

  function open(c: any | 'new') {
    const f = c === 'new' ? { ...EMPTY, code: randomCode() } : toForm(c);
    setEditing(c); setForm(f); setStart(JSON.stringify(f)); setError('');
  }
  const set = (p: Partial<Form>) => { setForm((f) => ({ ...f, ...p })); setError(''); };
  const toggle = (k: 'scopes' | 'boxTierIds', v: string) => set({ [k]: form[k].includes(v) ? form[k].filter((x) => x !== v) : [...form[k], v] } as any);

  function problems() {
    const v = Number(form.discountValue);
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(form.code.trim())) return 'The code needs 3–30 letters or numbers (- and _ are fine).';
    if (!(v > 0)) return 'Enter how much the code takes off.';
    if (form.discountType === 'PERCENTAGE' && v > 100) return 'A percentage can be at most 100%.';
    if (!form.scopes.length) return 'Choose at least one thing the code works on.';
    if (form.startsAt && form.expiresAt && form.expiresAt < form.startsAt) return 'The end date is before the start date.';
    return '';
  }

  async function save() {
    const p = problems();
    if (p) { setError(p); return; }
    setSaving(true); setError('');
    const boxy = form.scopes.includes('BOX') || form.scopes.includes('GIFT');
    const body: any = {
      scopes: form.scopes, description: form.description,
      maxDiscount: form.discountType === 'PERCENTAGE' ? num(form.maxDiscount) : null,
      boxTierIds: boxy ? form.boxTierIds : [], minPlanMonths: boxy ? num(form.minPlanMonths) : null,
      minOrderAmount: num(form.minOrderAmount), firstOrderOnly: form.firstOrderOnly,
      usageLimit: num(form.usageLimit), perUserLimit: num(form.perUserLimit),
      startsAt: form.startsAt || null, expiresAt: form.expiresAt ? `${form.expiresAt}T23:59:59` : null,
    };
    if (isNew || !used) Object.assign(body, { discountType: form.discountType, discountValue: Number(form.discountValue) });
    if (isNew) body.code = form.code.trim().toUpperCase();
    try {
      await (isNew ? post('/admin/coupons', body, 'Not saved. Try again.') : patch(`/admin/coupons/${current.id}`, body, 'Not saved. Try again.'));
      setEditing(null);
      setToast(isNew ? `${body.code} created` : 'Changes saved');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function act(kind: 'pause' | 'resume' | 'stop' | 'delete') {
    setBusy(true);
    const id = current.id;
    const failed = 'That didn’t work. Try again.';
    let d;
    try {
      d = (await (kind === 'delete' ? del(`/admin/coupons/${id}`, failed)
        : kind === 'stop' ? post(`/admin/coupons/${id}/stop`, undefined, failed)
        : patch(`/admin/coupons/${id}`, { isActive: kind === 'resume' }, failed))) ?? {};
    } catch (e: any) { setError(e.status ? e.message : failed); return; } finally { setBusy(false); setConfirm(null); }
    const list = await load();
    if (kind === 'delete' && d.deleted) { setEditing(null); setToast(`${current.code} deleted`); return; }
    const fresh = list.find((c: any) => c.id === id);
    if (fresh) setEditing(fresh);
    setToast(kind === 'pause' ? `${current.code} paused` : kind === 'resume' ? `${current.code} is live again` : `${current.code} stopped for good`);
  }

  const copy = (code: string) => navigator.clipboard?.writeText(code).then(() => setToast(`${code} copied`)).catch(() => {});

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)', maxWidth: 1200 }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Promo codes</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: '4px 0 0' }}>Discounts customers type in the basket — for the shop, boxes, gifts or delivery.</p>
        </div>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={() => download('/admin/coupons/export.csv', `promo-codes-${today()}.csv`).catch(() => {})} className="pc-btn soft">⬇ Export CSV</button>
        <button type="button" onClick={() => open('new')} className="pc-cta">
          <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> New promo code
        </button>
        </span>
      </div>

      {/* How the codes are doing */}
      <div className="pc-stats">
        <Stat label="Active codes" value={String(totals.active)} sub={`of ${codes.length} in total`} tone="teal" />
        <Stat label="Times used" value={totals.uses.toLocaleString('en-US')} sub="paid orders with a code" />
        <Stat label="Discount given" value={gel(totals.discount)} sub="taken off those orders" />
        <Stat label="Sales with codes" value={gel(totals.sales)} sub="what those orders paid" />
      </div>

      <FriendCodes />

      {/* Tabs by status, and search */}
      <div className="pc-bar">
        <div role="tablist" aria-label="Promo codes by status" className="pc-tabs">
          {TABS.map((t) => {
            const n = withStatus.filter((c) => t.has(c.status)).length;
            const on = tab === t.key;
            return (
              <button key={t.key} type="button" role="tab" aria-selected={on} onClick={() => setTab(t.key)} className={`pc-tab${on ? ' on' : ''}`}>
                {t.label}<span className="pc-count">{n}</span>
              </button>
            );
          })}
        </div>
        <label className="pc-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search codes" aria-label="Search promo codes" />
        </label>
      </div>

      {/* The codes */}
      {loading ? (
        <div style={{ display: 'grid', gap: 10 }}>{[0, 1, 2].map((i) => <div key={i} className="pc-skel" />)}</div>
      ) : shown.length === 0 ? (
        <div className="pc-empty">
          <div style={{ fontSize: 36 }}>🏷️</div>
          <p style={{ margin: '8px 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--slate-700)' }}>{codes.length ? 'No promo codes here' : 'No promo codes yet'}</p>
          {!codes.length && <button type="button" onClick={() => open('new')} className="pc-cta">＋ Create the first one</button>}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {shown.map((c) => {
            const st = STATUS[c.status as Status];
            const pct = c.usageLimit ? Math.min(100, (c.usedCount / c.usageLimit) * 100) : 0;
            const rules = [
              Number(c.minOrderAmount) > 0 && `from ${gel(c.minOrderAmount)}`,
              c.minPlanMonths && `${c.minPlanMonths}+ month plans`,
              c.boxTierIds?.length && tiers.filter((t) => c.boxTierIds.includes(t.id)).map((t) => t.name).join(' / '),
              c.firstOrderOnly && 'first order',
              c.maxDiscount && `max ${gel(c.maxDiscount)}`,
            ].filter(Boolean);
            return (
              <li key={c.id}>
                <div role="button" tabIndex={0} onClick={() => open(c)} onKeyDown={(e) => { if (e.key === 'Enter') open(c); }} className={`pc-row${c.status === 'stopped' || c.status === 'expired' || c.status === 'usedUp' ? ' dim' : ''}`}>
                  <div className="pc-codecell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="pc-code">{c.code}</span>
                      <button type="button" aria-label={`Copy ${c.code}`} title="Copy" onClick={(e) => { e.stopPropagation(); copy(c.code); }} className="pc-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6a2 2 0 012-2h9" /></svg>
                      </button>
                    </div>
                    {c.description && <p className="pc-note">{c.description}</p>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--teal-700)' }}>{c.discountType === 'PERCENTAGE' ? `${Number(c.discountValue)}%` : gel(c.discountValue)}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--slate-500)' }}>
                        {ALL.every((k) => c.scopes?.includes(k)) ? '✨ everything' : SCOPES.filter((s) => c.scopes?.includes(s.key)).map((s) => `${s.icon} ${s.label}`).join('  ')}
                      </span>
                    </div>
                    {rules.length > 0 && <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--slate-500)' }}>{rules.join(' · ')}</p>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--slate-600)', fontWeight: 600 }}>
                      <b style={{ color: 'var(--slate-900)' }}>{c.usedCount}</b>{c.usageLimit ? ` / ${c.usageLimit}` : ''} used
                      {c.stats?.sales > 0 && <span style={{ color: 'var(--slate-400)', fontWeight: 500 }}> · {gel(c.stats.sales)} sales</span>}
                    </div>
                    {c.usageLimit ? <div className="pc-meter"><span style={{ width: `${pct}%` }} /></div> : null}
                    <div style={{ fontSize: 11.5, color: 'var(--slate-400)', marginTop: 3 }}>
                      {c.status === 'scheduled' ? `Starts ${showDate(day(c.startsAt))}` : c.expiresAt ? `${c.status === 'expired' ? 'Ended' : 'Ends'} ${showDate(day(c.expiresAt))}` : 'No end date'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'end' }}>
                    <span className="pc-pill" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                    <span aria-hidden="true" style={{ color: 'var(--slate-300)', fontSize: 18 }}>›</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Create / edit */}
      <SideDrawer open={!!editing} dirty={dirty && !saving} onClose={() => setEditing(null)}
        title={isNew ? 'New promo code' : current?.code}
        subtitle={isNew ? 'Customers type it in the basket.' : current && <span className="pc-pill" style={{ background: STATUS[statusOf(current)].bg, color: STATUS[statusOf(current)].fg }}>{STATUS[statusOf(current)].label}</span>}
        footer={(close) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={close} className="pc-btn ghost">{stopped ? 'Close' : 'Cancel'}</button>
            <span style={{ flex: 1 }} />
            {!stopped && (
              <button type="button" onClick={save} disabled={saving || (!isNew && !dirty)} className="pc-btn primary">
                {saving ? 'Saving…' : isNew ? 'Create promo code' : 'Save changes'}
              </button>
            )}
          </div>
        )}>
        {current && (
          <div className="pc-stats mini">
            <Stat label="Used" value={`${current.usedCount}${current.usageLimit ? ` / ${current.usageLimit}` : ''}`} />
            <Stat label="Discount given" value={gel(current.stats?.discount)} />
            <Stat label="Sales" value={gel(current.stats?.sales)} />
          </div>
        )}
        {current && <UsedOn id={current.id} code={current.code} />}
        {stopped && <p className="pc-alert">This code was stopped on {showDate(day(current.stoppedAt))} and can’t be used again. To run it again, create a new code.</p>}

        <fieldset disabled={stopped} style={{ border: 'none', margin: 0, padding: 0, minWidth: 0, display: 'grid', gap: 12 }}>
          {Number(form.discountValue) > 0 && form.scopes.length > 0 && (
            <div className="pc-short"><b>In short:</b> {inShort(form, tiers)}</div>
          )}

          <Card title="Code">
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={form.code} disabled={!isNew} maxLength={30} aria-label="Promo code"
                onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                className="pc-input mono" style={{ flex: 1 }} placeholder="SUMMER20" />
              {isNew && <button type="button" onClick={() => set({ code: randomCode() })} className="pc-btn soft" title="Make a random code">🎲 Generate</button>}
            </div>
            <Label>Note for the team <i>optional</i></Label>
            <input value={form.description} onChange={(e) => set({ description: e.target.value })} maxLength={300} className="pc-input" placeholder="e.g. Instagram giveaway, October" />
          </Card>

          <Card title="Discount" hint={used ? 'Locked: the code has already been used. Stop it and make a new one to change the discount.' : undefined}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <Segmented value={form.discountType} disabled={used} onChange={(v) => set({ discountType: v })}
                options={[{ value: 'PERCENTAGE', label: '%' }, { value: 'FIXED', label: '₾' }]} />
              <NumberField value={form.discountValue} onChange={(v) => set({ discountValue: v })} decimals={form.discountType === 'FIXED'}
                max={form.discountType === 'PERCENTAGE' ? 100 : undefined} ariaLabel="Discount"
                prefix={form.discountType === 'FIXED' ? '₾' : undefined} suffix={form.discountType === 'PERCENTAGE' ? '% off' : 'off'}
                placeholder={form.discountType === 'PERCENTAGE' ? '15' : '10'} style={{ flex: 1, ...(used ? { opacity: 0.6, pointerEvents: 'none' } : {}) }} />
            </div>
            {form.discountType === 'PERCENTAGE' && (
              <>
                <Label>Most it can take off <i>optional</i></Label>
                <NumberField value={form.maxDiscount} onChange={(v) => set({ maxDiscount: v })} decimals prefix="₾" placeholder="No cap" ariaLabel="Maximum discount" />
              </>
            )}
          </Card>

          <Card title="Works on" hint="Pick any mix. Delivery only + 100% = free delivery.">
            <div className="pc-chips">
              <Chip on={ALL.every((k) => form.scopes.includes(k))} onClick={() => set({ scopes: ALL.every((k) => form.scopes.includes(k)) ? [] : [...ALL] })}>✨ Everything</Chip>
              {SCOPES.map((s) => <Chip key={s.key} on={form.scopes.includes(s.key)} onClick={() => toggle('scopes', s.key)}>{s.icon} {s.label}</Chip>)}
            </div>
            {!form.scopes.length && <p className="pc-err">Choose at least one.</p>}
          </Card>

          {(form.scopes.includes('BOX') || form.scopes.includes('GIFT')) && (
            <Card title="Which box plans" hint="Leave as is for every plan.">
              <Label>Box type</Label>
              <div className="pc-chips">
                <Chip on={!form.boxTierIds.length} onClick={() => set({ boxTierIds: [] })}>All types</Chip>
                {tiers.map((t) => <Chip key={t.id} on={form.boxTierIds.includes(t.id)} onClick={() => toggle('boxTierIds', t.id)}>{t.emoji ? `${t.emoji} ` : ''}{t.name}</Chip>)}
              </div>
              <Label>Plan length</Label>
              <div className="pc-chips">
                <Chip on={!form.minPlanMonths} onClick={() => set({ minPlanMonths: '' })}>Any length</Chip>
                {lengths.map((m) => <Chip key={m} on={form.minPlanMonths === String(m)} onClick={() => set({ minPlanMonths: String(m) })}>{m}+ months</Chip>)}
              </div>
            </Card>
          )}

          <Card title="Who can use it">
            <Label>Minimum order <i>optional</i></Label>
            <NumberField value={form.minOrderAmount} onChange={(v) => set({ minOrderAmount: v })} decimals prefix="₾" placeholder="No minimum" ariaLabel="Minimum order" />
            <Toggle on={form.firstOrderOnly} onChange={(v) => set({ firstOrderOnly: v })} title="New customers only" text="Works only on a customer’s first paid order." />
            <div className="pc-two">
              <div>
                <Label>Uses in total</Label>
                <NumberField stepper value={form.usageLimit} onChange={(v) => set({ usageLimit: v })} min={1} placeholder="Unlimited" ariaLabel="Uses in total" />
              </div>
              <div>
                <Label>Uses per customer</Label>
                <NumberField stepper value={form.perUserLimit} onChange={(v) => set({ perUserLimit: v })} min={1} placeholder="Unlimited" ariaLabel="Uses per customer" />
              </div>
            </div>
          </Card>

          <Card title="When">
            <div className="pc-two">
              <div>
                <Label>Starts</Label>
                <DateField value={form.startsAt} onChange={(v) => set({ startsAt: v })} min={isNew ? todayIso() : undefined} emptyLabel="Right away" ariaLabel="Start date"
                  quick={[{ label: 'Today', value: todayIso() }, { label: 'Tomorrow', value: inDays(1) }, { label: 'In a week', value: inDays(7) }]} />
              </div>
              <div>
                <Label>Ends</Label>
                <DateField value={form.expiresAt} onChange={(v) => set({ expiresAt: v })} min={form.startsAt || todayIso()} emptyLabel="Never ends" ariaLabel="End date"
                  quick={[{ label: 'In 7 days', value: inDays(7) }, { label: 'In 30 days', value: inDays(30) }, { label: 'End of month', value: endOfMonth() }]} />
              </div>
            </div>
          </Card>
        </fieldset>

        {error && <p role="alert" className="pc-alert" style={{ marginTop: 12 }}>{error}</p>}

        {/* Switching it off — kept apart from saving */}
        {current && !stopped && (
          <Card title="Switch off" tone="danger">
            <div className="pc-off">
              <div style={{ flex: 1, minWidth: 180 }}>
                <b>{current.isActive ? 'Pause' : 'Resume'}</b>
                <p>{current.isActive ? 'Stops it for now; you can turn it back on.' : 'Customers can use it again.'}</p>
              </div>
              <button type="button" onClick={() => act(current.isActive ? 'pause' : 'resume')} disabled={busy} className="pc-btn soft">{current.isActive ? '⏸ Pause' : '▶ Resume'}</button>
            </div>
            <div className="pc-off">
              <div style={{ flex: 1, minWidth: 180 }}>
                <b style={{ color: 'var(--red-700)' }}>Stop for good</b>
                <p>It never works again and can’t be turned back on.</p>
              </div>
              <button type="button" onClick={() => setConfirm('stop')} disabled={busy} className="pc-btn danger">⛔ Stop</button>
            </div>
            {!used && (
              <div className="pc-off">
                <div style={{ flex: 1, minWidth: 180 }}><b>Delete</b><p>Never used, so it can be removed completely.</p></div>
                <button type="button" onClick={() => setConfirm('delete')} disabled={busy} className="pc-btn ghost" style={{ color: 'var(--red-600)' }}>Delete</button>
              </div>
            )}
          </Card>
        )}
      </SideDrawer>

      <ConfirmSheet open={confirm === 'stop'} title={`Stop ${current?.code ?? ''} for good?`} confirmLabel="Stop for good" tone="danger" busy={busy}
        onClose={() => setConfirm(null)} onConfirm={() => act('stop')}>
        It stops working straight away and is taken out of any basket holding it. It can’t be turned back on — you’d need a new code.
      </ConfirmSheet>
      <ConfirmSheet open={confirm === 'delete'} title={`Delete ${current?.code ?? ''}?`} confirmLabel="Delete" tone="danger" busy={busy}
        onClose={() => setConfirm(null)} onConfirm={() => act('delete')}>
        It has never been used, so it will be removed completely.
      </ConfirmSheet>
      {toast && <Toast text={toast} onClose={() => setToast('')} />}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'teal' }) {
  return (
    <div className="pc-stat" style={tone ? { background: 'var(--teal-50)', borderColor: 'var(--teal-100)' } : undefined}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: tone ? 'var(--teal-800)' : 'var(--slate-500)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: '2px 0', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--slate-400)' }}>{sub}</div>}
    </div>
  );
}

function Card({ title, hint, tone, children }: { title: string; hint?: string; tone?: 'danger'; children: ReactNode }) {
  return (
    <section style={{ background: 'var(--white)', borderRadius: 16, padding: 16, border: `1px solid ${tone === 'danger' ? 'var(--red-100)' : 'var(--slate-100)'}`, marginTop: tone ? 12 : 0 }}>
      <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: tone === 'danger' ? 'var(--red-700)' : 'var(--slate-900)' }}>{title}</h3>
      {hint && <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--slate-500)' }}>{hint}</p>}
      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>{children}</div>
    </section>
  );
}

const Label = ({ children }: { children: ReactNode }) => <div className="pc-label">{children}</div>;

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" role="checkbox" aria-checked={on} onClick={onClick} className={`pc-chip${on ? ' on' : ''}`}>{on ? '✓ ' : ''}{children}</button>;
}

function Segmented({ value, options, onChange, disabled }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" style={{ display: 'flex', padding: 3, gap: 2, borderRadius: 12, background: 'var(--slate-100)', flexShrink: 0, opacity: disabled ? 0.6 : 1 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange(o.value)}
            style={{ width: 46, flexShrink: 0, border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 800, cursor: disabled ? 'default' : 'pointer', background: on ? 'var(--white)' : 'transparent', color: on ? 'var(--teal-700)' : 'var(--slate-500)', boxShadow: on ? '0 1px 3px rgba(15,23,42,.12)' : 'none' } as CSSProperties}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ on, onChange, title, text }: { on: boolean; onChange: (v: boolean) => void; title: string; text: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 12px', marginTop: 4, borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left', background: on ? 'var(--teal-50)' : 'var(--slate-50)' }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--slate-900)' }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--slate-500)' }}>{text}</span>
      </span>
      <span aria-hidden="true" style={{ position: 'relative', width: 42, height: 25, borderRadius: 99, flexShrink: 0, background: on ? 'var(--teal-600)' : 'var(--slate-300)', transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 20 : 3, width: 19, height: 19, borderRadius: 99, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .15s' }} />
      </span>
    </button>
  );
}

const CSS = `
.pc-cta { display: inline-flex; align-items: center; gap: 8px; border: none; border-radius: 13px; padding: 11px 18px; background: var(--teal-600); color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 8px 22px -8px var(--teal-500); transition: transform .12s, box-shadow .12s; white-space: nowrap; }
.pc-cta:hover { transform: translateY(-1px); box-shadow: 0 12px 26px -8px var(--teal-500); }
.pc-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.pc-stats.mini { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
.pc-stats.mini .pc-stat { padding: 10px 12px; }
.pc-stat { background: var(--white); border: 1px solid var(--slate-100); border-radius: 16px; padding: 14px 16px; min-width: 0; }
.pc-bar { display: flex; align-items: center; gap: 12px; margin: 18px 0 12px; flex-wrap: wrap; }
.pc-tabs { display: flex; gap: 4px; padding: 4px; background: var(--slate-100); border-radius: 14px; overflow-x: auto; max-width: 100%; scrollbar-width: none; }
.pc-tab { display: inline-flex; align-items: center; gap: 6px; border: none; background: transparent; padding: 8px 12px; border-radius: 10px; font-size: 13px; font-weight: 700; color: var(--slate-500); cursor: pointer; white-space: nowrap; }
.pc-tab.on { background: var(--white); color: var(--slate-900); box-shadow: 0 1px 3px rgba(15,23,42,.1); }
.pc-count { font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 99px; background: var(--slate-200); color: var(--slate-600); }
.pc-tab.on .pc-count { background: var(--teal-100); color: var(--teal-800); }
.pc-search { flex: 1; min-width: 180px; display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 12px; border-radius: 12px; background: var(--white); border: 1.5px solid var(--slate-200); color: var(--slate-400); }
.pc-search:focus-within { border-color: var(--teal-400); box-shadow: 0 0 0 3px var(--teal-100); }
.pc-search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 14px; color: var(--slate-900); }
.pc-row { display: grid; grid-template-columns: minmax(150px, 1.1fr) minmax(0, 1.5fr) minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 14px 16px; background: var(--white); border: 1px solid var(--slate-100); border-radius: 16px; cursor: pointer; transition: border-color .12s, box-shadow .12s, transform .12s; }
.pc-row:hover, .pc-row:focus-visible { border-color: var(--teal-200); box-shadow: 0 6px 20px -12px rgba(15,23,42,.25); outline: none; }
.pc-row.dim { opacity: .62; }
.pc-codecell { min-width: 0; }
.pc-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; font-size: 14px; letter-spacing: .06em; color: var(--slate-900); background: var(--slate-100); padding: 5px 10px; border-radius: 9px; border: 1.5px dashed var(--slate-300); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.pc-note { margin: 5px 0 0; font-size: 11.5px; color: var(--slate-500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-icon { width: 28px; height: 28px; flex-shrink: 0; border: none; border-radius: 8px; background: transparent; color: var(--slate-400); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.pc-icon:hover { background: var(--slate-100); color: var(--teal-700); }
.pc-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 800; white-space: nowrap; }
.pc-meter { height: 5px; border-radius: 99px; background: var(--slate-100); margin-top: 5px; overflow: hidden; max-width: 160px; }
.pc-meter span { display: block; height: 100%; border-radius: 99px; background: var(--teal-500); }
.pc-skel { height: 74px; border-radius: 16px; background: linear-gradient(90deg, var(--slate-100), var(--slate-50), var(--slate-100)); background-size: 200% 100%; animation: pcSk 1.2s infinite linear; }
@keyframes pcSk { to { background-position: -200% 0; } }
.pc-empty { text-align: center; padding: 56px 16px; background: var(--white); border: 1.5px dashed var(--slate-200); border-radius: 18px; }
.pc-short { font-size: 13px; line-height: 1.5; color: var(--teal-900); background: var(--teal-50); border: 1px solid var(--teal-100); border-radius: 14px; padding: 11px 14px; }
.pc-label { font-size: 12px; font-weight: 700; color: var(--slate-600); margin-top: 6px; }
.pc-label i { font-style: normal; font-weight: 500; color: var(--slate-400); }
.pc-input { width: 100%; box-sizing: border-box; min-height: 44px; padding: 0 12px; border-radius: 12px; border: 1.5px solid var(--slate-200); background: var(--white); font-size: 14px; color: var(--slate-900); outline: none; }
.pc-input:focus { border-color: var(--teal-400); box-shadow: 0 0 0 3px var(--teal-100); }
.pc-input:disabled { background: var(--slate-50); color: var(--slate-500); }
.pc-input.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; letter-spacing: .08em; font-size: 15px; }
.pc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pc-chip { min-height: 36px; padding: 0 13px; border-radius: 99px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1.5px solid var(--slate-200); background: var(--white); color: var(--slate-600); transition: all .12s; }
.pc-chip:hover { border-color: var(--teal-300); }
.pc-chip.on { border-color: var(--teal-500); background: var(--teal-50); color: var(--teal-800); }
.pc-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pc-btn { min-height: 44px; padding: 0 16px; border-radius: 12px; font-size: 14px; font-weight: 800; cursor: pointer; border: none; white-space: nowrap; }
.pc-btn:disabled { opacity: .5; cursor: default; }
.pc-btn.primary { background: var(--teal-600); color: #fff; padding: 0 22px; }
.pc-btn.ghost { background: transparent; color: var(--slate-600); border: 1.5px solid var(--slate-200); }
.pc-btn.soft { background: var(--slate-100); color: var(--slate-700); }
.pc-btn.danger { background: var(--red-50); color: var(--red-700); border: 1.5px solid var(--red-200); }
.pc-off { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 0; border-top: 1px solid var(--slate-100); }
.pc-off:first-child { border-top: none; padding-top: 0; }
.pc-off b { font-size: 13.5px; color: var(--slate-900); }
.pc-off p { margin: 2px 0 0; font-size: 12px; color: var(--slate-500); }
.pc-alert { margin: 0 0 12px; font-size: 13px; color: var(--red-700); background: var(--red-50); border-radius: 12px; padding: 10px 14px; }
.pc-err { margin: 0; font-size: 12px; color: var(--red-600); }
@media (max-width: 900px) {
  .pc-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pc-row { grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; }
  .pc-row > :nth-child(2), .pc-row > :nth-child(3) { grid-column: 1 / -1; }
  .pc-row > :nth-child(4) { grid-row: 1; grid-column: 2; }
}
@media (max-width: 480px) {
  .pc-two { grid-template-columns: 1fr; }
  .pc-cta { padding: 10px 14px; }
}
`;
