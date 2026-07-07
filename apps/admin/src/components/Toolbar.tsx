'use client';
import React, { useState, useRef, useEffect } from 'react';

// ── CustomSelect ──────────────────────────────────────────────────────────────

export type CustomSelectOption = {
  value: string;
  label: string;
  dividerBefore?: boolean;
};

export function CustomSelect({ value, onChange, options, placeholder = 'Select…', style }: {
  value: string;
  onChange: (v: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value);
  const active = !!value;

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 12px',
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          borderRadius: 9,
          border: `1.5px solid ${active ? '#0d9488' : '#e2e8f0'}`,
          background: active ? '#f0fdfa' : '#fff',
          color: active ? '#0d9488' : '#94a3b8',
          cursor: 'pointer',
          outline: 'none',
          textAlign: 'left',
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg width="10" height="6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 10 6"
          style={{ flexShrink: 0, marginLeft: 8, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="M1 1l4 4 4-4"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.10)', overflow: 'hidden',
        }}>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {options.map((opt, i) => (
              <React.Fragment key={opt.value}>
                {opt.dividerBefore && <div style={{ height: 1, background: '#f1f5f9', margin: '2px 0' }} />}
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 12px',
                    fontSize: 13,
                    fontWeight: opt.value === value ? 600 : 400,
                    border: 'none',
                    background: opt.value === value ? '#f0fdfa' : 'transparent',
                    color: opt.value === value ? '#0d9488' : '#1e293b',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  {opt.value === value && (
                    <svg width="12" height="12" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                  {opt.value !== value && <span style={{ width: 12, flexShrink: 0 }} />}
                  {opt.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ActionButton ──────────────────────────────────────────────────────────────

export function ActionButton({ onClick, children, variant = 'primary', style, disabled }: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const isPrimary = variant === 'primary';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={e => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.background = isPrimary ? '#0f766e' : '#f8fafc';
        (e.currentTarget as HTMLButtonElement).style.borderColor = isPrimary ? '#0f766e' : '#cbd5e1';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = isPrimary ? '#0d9488' : '#fff';
        (e.currentTarget as HTMLButtonElement).style.borderColor = isPrimary ? 'transparent' : '#e2e8f0';
      }}
      onMouseDown={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
      onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      style={{
        background: isPrimary ? '#0d9488' : '#fff',
        color: isPrimary ? '#fff' : '#334155',
        border: isPrimary ? 'none' : '1.5px solid #e2e8f0',
        borderRadius: 9,
        padding: '7px 16px',
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.6 : 1,
        transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── FilterSelect ──────────────────────────────────────────────────────────────

export function FilterSelect({ value, onChange, children, style }: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const active = !!value;
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '5px 28px 5px 10px',
        borderRadius: 9,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        border: `1.5px solid ${active ? '#0d9488' : '#e2e8f0'}`,
        background: active
          ? '#f0fdfa'
          : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E") no-repeat right 8px center #fff`,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        color: active ? '#0d9488' : '#64748b',
        outline: 'none',
        appearance: 'none' as any,
        ...style,
      }}
    >
      {children}
    </select>
  );
}

// ── SortBar ───────────────────────────────────────────────────────────────────
// sort: current sort string, e.g. 'name_asc' | 'price_desc' | ''
// fields: array of { field, label, icon? }

export type SortField = {
  field: string;
  label: string;
  icon?: React.ReactNode;
};

export function SortBar({ sort, onSort, fields }: {
  sort: string;
  onSort: (next: string) => void;
  fields: SortField[];
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: '3px 4px' }}>
      {fields.map(({ field, label, icon }) => {
        const active = sort.startsWith(field);
        const asc = sort === `${field}_asc`;
        return (
          <button
            key={field}
            title={label}
            onClick={() => onSort(active ? (asc ? `${field}_desc` : '') : `${field}_asc`)}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 9px',
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              background: active ? '#fff' : 'transparent',
              color: active ? '#0d9488' : '#94a3b8',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.12s, transform 0.1s',
            }}
          >
            {icon && icon}
            <span>{label}</span>
            {active && (
              <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {asc ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── SearchInput ───────────────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder, width = 200 }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number | string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        style={{ paddingLeft: 32, paddingRight: 14, paddingTop: 7, paddingBottom: 7, fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 999, outline: 'none', background: '#fff', width }}
      />
    </div>
  );
}

// ── ViewToggle ────────────────────────────────────────────────────────────────

export type ViewMode = 'card' | 'list';

export function ViewToggle({ mode, onChange }: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div style={{ display: 'flex', border: '1.5px solid #e2e8f0', borderRadius: 9, overflow: 'hidden' }}>
      {(['card', 'list'] as ViewMode[]).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          onMouseEnter={e => { if (mode !== m) (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; }}
          onMouseLeave={e => { if (mode !== m) (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.88)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          style={{
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            borderRight: m === 'card' ? '1.5px solid #e2e8f0' : 'none',
            background: mode === m ? '#0d9488' : '#fff',
            color: mode === m ? '#fff' : '#64748b',
            cursor: 'pointer',
            transition: 'background 0.15s, transform 0.1s',
          }}
        >
          {m === 'card' ? (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          ) : (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────
// Convenience wrapper: flex row, gap 8, wraps on small screens

export function Toolbar({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', ...style }}>
      {children}
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

const STAT_THEMES = {
  teal:   { bg: '#f0fdfa', border: '#99f6e4', text: '#0d9488' },
  green:  { bg: '#f0fdf4', border: '#86efac', text: '#16a34a' },
  red:    { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
  amber:  { bg: '#fffbeb', border: '#fcd34d', text: '#d97706' },
  blue:   { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb' },
  purple: { bg: '#faf5ff', border: '#c4b5fd', text: '#7c3aed' },
  slate:  { bg: '#f8fafc', border: '#cbd5e1', text: '#475569' },
};

export type StatCardTheme = keyof typeof STAT_THEMES;

export function StatCard({ value, label, theme = 'teal' }: {
  value: React.ReactNode;
  label: string;
  theme?: StatCardTheme;
}) {
  const t = STAT_THEMES[theme];
  return (
    <div style={{
      background: t.bg,
      border: `1.5px solid ${t.border}`,
      borderRadius: 14,
      padding: '14px 22px',
      textAlign: 'right',
      minWidth: 100,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: t.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.text, marginTop: 6 }}>{label}</div>
    </div>
  );
}

// ── PlanHighlightCard ─────────────────────────────────────────────────────────
// Rich stat card showing a badge + plan name + sub-label (e.g. order count)

const BADGE_STYLES: Record<string, { bg: string; border: string; text: string; pill: string; pillText: string }> = {
  popular:    { bg: '#f0fdfa', border: '#99f6e4', text: '#0d9488', pill: '#0d9488', pillText: '#fff' },
  best_value: { bg: '#faf5ff', border: '#c4b5fd', text: '#7c3aed', pill: '#7c3aed', pillText: '#fff' },
};

export function PlanHighlightCard({ badge, planName, sub, empty }: {
  badge: 'popular' | 'best_value';
  planName?: string;
  sub?: string;
  empty?: string;
}) {
  const s = BADGE_STYLES[badge];
  const label = badge === 'popular' ? 'Most Popular' : 'Best Value';
  return (
    <div style={{ background: planName ? s.bg : '#f8fafc', border: `1.5px solid ${planName ? s.border : '#e2e8f0'}`, borderRadius: 14, padding: '14px 18px', minWidth: 160 }}>
      <span style={{ display: 'inline-block', background: planName ? s.pill : '#e2e8f0', color: planName ? s.pillText : '#94a3b8', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 10px', letterSpacing: '0.04em', marginBottom: 8 }}>
        {label}
      </span>
      {planName ? (
        <>
          <div style={{ fontSize: 14, fontWeight: 800, color: s.text, lineHeight: 1.2 }}>{planName}</div>
          {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 500 }}>{sub}</div>}
        </>
      ) : (
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{empty ?? 'Not assigned'}</div>
      )}
    </div>
  );
}

// ── RowActions ────────────────────────────────────────────────────────────────
// Shared icon-button row: View · Configure · Enable/Disable · Delete

export function RowActions({
  onView, onConfigure, onToggle, onDelete,
  isDisabled, canDelete,
  toggleLabel,
}: {
  onView?: () => void;
  onConfigure?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
  isDisabled?: boolean;
  canDelete?: boolean;
  toggleLabel?: string;
}) {
  function iconBtn(
    onClick: () => void,
    title: string,
    bg: string,
    hoverBg: string,
    color: string,
    icon: React.ReactNode,
  ) {
    return (
      <button
        onClick={onClick}
        title={title}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = hoverBg; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = bg; }}
        onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.88)'; }}
        onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.background = bg; }}
        style={{ width: 32, height: 32, borderRadius: 8, background: bg, color, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, transform 0.1s', flexShrink: 0 }}
      >
        {icon}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {onView && iconBtn(onView, 'View', 'rgba(13,148,136,0.1)', 'rgba(13,148,136,0.2)', '#0d9488',
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>
      )}
      {onConfigure && iconBtn(onConfigure, 'Configure', 'rgba(13,148,136,0.1)', 'rgba(13,148,136,0.2)', '#0d9488',
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      )}
      {onToggle && iconBtn(onToggle, toggleLabel ?? (isDisabled ? 'Enable' : 'Disable'),
        isDisabled ? 'rgba(22,163,74,0.1)' : 'rgba(100,116,139,0.1)',
        isDisabled ? 'rgba(22,163,74,0.2)' : 'rgba(100,116,139,0.2)',
        isDisabled ? '#16a34a' : '#64748b',
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
      )}
      {onDelete && canDelete && iconBtn(onDelete, 'Delete', 'rgba(220,38,38,0.08)', 'rgba(220,38,38,0.16)', '#dc2626',
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      )}
    </div>
  );
}

// ── StatCards row wrapper ─────────────────────────────────────────────────────

export function StatCards({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
      {children}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({
  page, totalPages, pageSize, total,
  onPageChange, onPageSizeChange,
  pageSizeOptions = [5, 10, 15, 20, 50],
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
  pageSizeOptions?: number[];
}) {
  const btn = (
    content: React.ReactNode,
    onClick: () => void,
    active = false,
    disabled = false,
  ) => (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={e => { if (!disabled && !active) (e.currentTarget as HTMLButtonElement).style.background = '#e2e8f0'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = disabled ? '#f8fafc' : '#f1f5f9'; }}
      onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.93)'; }}
      onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      style={{
        width: 34, height: 34, borderRadius: 8,
        border: active ? '2px solid #0d9488' : '1px solid #e2e8f0',
        background: active ? '#f0fdfa' : disabled ? '#f8fafc' : '#f1f5f9',
        color: active ? '#0d9488' : disabled ? '#cbd5e1' : '#374151',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13, fontWeight: active ? 700 : 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, transform 0.1s',
        flexShrink: 0,
      }}
    >{content}</button>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
      {/* Per-page */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>Show</span>
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          style={{
            height: 32, padding: '0 28px 0 10px', borderRadius: 8,
            border: '1px solid #e2e8f0', background: '#f8fafc',
            color: '#374151', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', outline: 'none', appearance: 'none' as any,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' fill='none' stroke='%2394a3b8' strokeWidth='2' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
          }}
        >
          {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>per page</span>
      </div>

      {/* Pages */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {btn('‹', () => onPageChange(Math.max(1, page - 1)), false, page === 1)}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(n =>
          btn(n, () => onPageChange(n), n === page)
        )}
        {btn('›', () => onPageChange(Math.min(totalPages, page + 1)), false, page === totalPages)}
        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
        </span>
      </div>
    </div>
  );
}
