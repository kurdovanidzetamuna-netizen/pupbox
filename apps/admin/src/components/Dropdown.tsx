'use client';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type DropdownOption = {
  value: string;
  label: string;
  /** Small grey text after the label (a count, a price). */
  hint?: string;
  icon?: React.ReactNode;
  /** Heading the option sits under (like <optgroup>). */
  group?: string;
  /** Indented under the option before it (a subcategory). */
  indent?: boolean;
  disabled?: boolean;
};

type Common = {
  options: DropdownOption[];
  placeholder?: string;
  /** Shown before the value inside the button, e.g. "Status". */
  label?: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  disabled?: boolean;
  'aria-label'?: string;
  id?: string;
  /** A search box at the top; on by default for long lists. */
  searchable?: boolean;
  /** Fill the width it's given (forms) instead of sizing to content (filters). */
  block?: boolean;
};
type Single = Common & { multiple?: false; value: string; onChange: (v: string) => void };
type Multi = Common & { multiple: true; value: string[]; onChange: (v: string[]) => void };

const PHONE = 640;

/**
 * The one dropdown of the admin panel: a soft filled button that opens a
 * floating list — groups, counts, a tick on the chosen one, a search box
 * for long lists, keyboard (↑ ↓ Enter Esc, type to jump) and, on phones, a
 * sheet from the bottom that's easy to tap. `multiple` lets several be
 * ticked at once (filters), with "Clear" at the bottom. The list floats
 * above everything, so a table or drawer never cuts it off.
 */
export default function Dropdown(props: Single | Multi) {
  const { options, placeholder = 'Select…', label, icon, style, disabled, searchable, block } = props;
  const multi = props.multiple === true;
  const values = multi ? (props.value as string[]) : props.value ? [props.value as string] : [];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);
  const [phone, setPhone] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  const listId = useMemo(() => `dd-${Math.random().toString(36).slice(2, 8)}`, []);
  const canSearch = searchable ?? options.length > 8;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.group?.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      setPhone(window.innerWidth < PHONE);
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.max(r.width, 220);
      const h = Math.min(pop.current?.offsetHeight ?? 320, 380);
      const up = r.bottom + h + 8 > window.innerHeight && r.top - h - 8 > 0;
      setPos({ top: up ? r.top - h - 6 : r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), width, up });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, shown.length]);

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    const first = shown.findIndex((o) => (multi ? values.includes(o.value) : o.value === props.value));
    setHi(first >= 0 ? first : 0);
    if (canSearch && window.innerWidth >= PHONE) setTimeout(() => searchBox.current?.focus(), 0);
    const down = (e: MouseEvent) => {
      const n = e.target as Node;
      if (!pop.current?.contains(n) && !btn.current?.contains(n)) setOpen(false);
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(o: DropdownOption) {
    if (o.disabled) return;
    if (multi) {
      const next = values.includes(o.value) ? values.filter((v) => v !== o.value) : [...values, o.value];
      (props.onChange as (v: string[]) => void)(next);
    } else {
      (props.onChange as (v: string) => void)(o.value);
      setOpen(false);
      btn.current?.focus();
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); btn.current?.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(shown.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[hi]) choose(shown[hi]); }
    else if (e.key === 'Tab') setOpen(false);
    else if (!canSearch && e.key.length === 1) {
      const i = shown.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setHi(i);
    }
  }
  // Esc inside a drawer or pop-up closes only this list.
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus(); } };
    window.addEventListener('keydown', esc, true);
    return () => window.removeEventListener('keydown', esc, true);
  }, [open]);
  useEffect(() => { pop.current?.querySelector(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' }); }, [hi]);

  const picked = options.filter((o) => values.includes(o.value));
  // A single choice whose value is '' ("All", "Newest first") still shows its label, just not highlighted.
  const plain = !multi ? options.find((o) => o.value === props.value) : undefined;
  const on = picked.length > 0;
  const text = multi ? (!on ? placeholder : picked.length === 1 ? picked[0].label : `${picked[0].label} +${picked.length - 1}`) : plain?.label ?? placeholder;

  let lastGroup: string | undefined;
  const list = (
    <div role="listbox" id={listId} aria-multiselectable={multi || undefined} style={{ overflowY: 'auto', maxHeight: phone ? '55vh' : 300, padding: 4 }}>
      {shown.length === 0 && <p style={{ margin: 0, padding: '14px 12px', fontSize: 13, color: 'var(--slate-400)' }}>Nothing found</p>}
      {shown.map((o, i) => {
        const sel = multi ? values.includes(o.value) : o.value === props.value;
        const head = o.group && o.group !== lastGroup ? o.group : null;
        lastGroup = o.group;
        return (
          <React.Fragment key={o.value || `__${i}`}>
            {head && <div style={{ padding: '10px 10px 4px', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--slate-400)' }}>{head}</div>}
            <div role="option" aria-selected={sel} aria-disabled={o.disabled || undefined} data-i={i}
              onMouseEnter={() => setHi(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: phone ? '12px 12px' : '8px 10px', paddingLeft: o.indent ? 30 : phone ? 12 : 10,
                borderRadius: 9, cursor: o.disabled ? 'default' : 'pointer', fontSize: phone ? 15 : 13, opacity: o.disabled ? 0.45 : 1,
                background: i === hi ? (sel ? 'var(--teal-100)' : 'var(--slate-100)') : sel ? 'var(--teal-50)' : 'transparent',
                color: sel ? 'var(--teal-700)' : 'var(--slate-800)', fontWeight: sel ? 700 : 500,
              }}>
              <span aria-hidden="true" style={{
                width: 18, height: 18, flexShrink: 0, borderRadius: multi ? 5 : 99, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: sel ? 'none' : multi ? '1.5px solid var(--slate-300)' : 'none', background: sel ? 'var(--teal-600)' : 'transparent', color: 'var(--white)',
              }}>
                {sel && <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>}
              </span>
              {o.icon && <span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0 }}>{o.icon}</span>}
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
              {o.hint && <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: sel ? 'var(--teal-600)' : 'var(--slate-400)', background: sel ? 'var(--white)' : 'var(--slate-100)', borderRadius: 99, padding: '1px 7px' }}>{o.hint}</span>}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <>
      <button ref={btn} type="button" id={props.id} disabled={disabled} onClick={() => setOpen((o) => !o)} onKeyDown={onKey}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-label={props['aria-label'] ? `${props['aria-label']}: ${on ? text : placeholder}` : undefined}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '6px 10px 6px 12px', borderRadius: 10,
          border: `1.5px solid ${open ? 'var(--teal-400)' : on ? 'var(--teal-300)' : 'var(--slate-200)'}`,
          background: on ? 'var(--teal-50)' : 'var(--white)', color: on ? 'var(--teal-800)' : 'var(--slate-600)',
          fontSize: 13, fontWeight: on ? 700 : 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
          boxShadow: open ? '0 0 0 3px var(--teal-100)' : 'none', transition: 'border-color .15s, box-shadow .15s, background .15s',
          maxWidth: '100%', minWidth: 0, textAlign: 'left', fontFamily: 'inherit', outline: 'none',
          ...(block ? { width: '100%', justifyContent: 'space-between' } : {}), ...style,
        }}>
        {icon && <span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span>}
        <span style={{ flex: block ? 1 : undefined, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label && <span style={{ fontWeight: 600, color: on ? 'var(--teal-600)' : 'var(--slate-400)' }}>{label}{on || plain ? ': ' : ''}</span>}
          {label && !on && !plain ? '' : text}
        </span>
        {multi && picked.length > 1 && <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 99, background: 'var(--teal-600)', color: 'var(--white)', fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{picked.length}</span>}
        <svg aria-hidden="true" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 10 6" style={{ flexShrink: 0, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}><path d="M1 1l4 4 4-4" /></svg>
      </button>

      {open && createPortal(
        <>
          {phone && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.35)', zIndex: 300 }} />}
          <div ref={pop} onKeyDown={onKey}
            style={phone
              ? { position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 301, background: 'var(--white)', borderRadius: '18px 18px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,.2)', paddingBottom: 'env(safe-area-inset-bottom)', animation: 'ddUp .2s ease-out' }
              : { position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? 0, width: pos?.width, zIndex: 301, background: 'var(--white)', borderRadius: 14, border: '1px solid var(--slate-200b)', boxShadow: '0 16px 40px -12px rgba(15,23,42,.3)', animation: 'ddIn .12s ease-out' }}>
            <style>{'@keyframes ddIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}@keyframes ddUp{from{transform:translateY(100%)}to{transform:none}}'}</style>
            {phone && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 6px' }}>
                <strong style={{ fontSize: 15, color: 'var(--slate-900)' }}>{props['aria-label'] || label || placeholder}</strong>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 99, border: 'none', background: 'var(--slate-100)', fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>
            )}
            {canSearch && (
              <div style={{ padding: '8px 8px 2px' }}>
                <input ref={searchBox} value={query} onChange={(e) => { setQuery(e.target.value); setHi(0); }} placeholder="Search…" aria-label="Search options" aria-controls={listId}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: phone ? 15 : 13, border: '1.5px solid var(--slate-200)', borderRadius: 9, outline: 'none' }} />
              </div>
            )}
            {list}
            {multi && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: 8, borderTop: '1px solid var(--slate-100)' }}>
                <button type="button" onClick={() => (props.onChange as (v: string[]) => void)([])} disabled={!on}
                  style={{ border: 'none', background: 'none', color: on ? 'var(--red-600)' : 'var(--slate-300)', fontSize: 13, fontWeight: 700, cursor: on ? 'pointer' : 'default', padding: '6px 8px' }}>Clear</button>
                <button type="button" onClick={() => setOpen(false)}
                  style={{ border: 'none', background: 'var(--teal-600)', color: 'var(--white)', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '7px 14px' }}>Done{on ? ` (${picked.length})` : ''}</button>
              </div>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

/**
 * A drop-in for a plain <select>: same children (<option>, <optgroup>), same
 * onChange (it gets `{ target: { value } }`), the Dropdown look. Lets every
 * screen switch over without rewriting its handlers.
 */
export function Select({ value, onChange, children, style, disabled, className: _c, ...rest }: {
  value?: string | number | readonly string[];
  /** Gets `{ target: { value, name } }`, like a select's change event. */
  onChange?: (e: any) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  id?: string;
  name?: string;
  required?: boolean;
}) {
  const options: DropdownOption[] = [];
  let placeholder: string | undefined;
  const walk = (nodes: React.ReactNode, group?: string) => React.Children.forEach(nodes, (n: any) => {
    if (!n) return;
    if (n.type === React.Fragment) return walk(n.props.children, group);
    if (Array.isArray(n)) return walk(n, group);
    if (n.type === 'optgroup') return walk(n.props.children, n.props.label);
    if (n.type === 'option') {
      const v = String(n.props.value ?? (typeof n.props.children === 'string' ? n.props.children : ''));
      const text = React.Children.toArray(n.props.children).join('');
      if (v === '' && !placeholder) placeholder = text;
      options.push({ value: v, label: text, group, disabled: n.props.disabled });
    }
  });
  walk(children);
  // Field-like width: forms pass width 100% or flex; keep the look, drop native-only bits.
  const { padding: _p, border: _b, borderRadius: _r, background: _bg, fontSize: _f, outline: _o, cursor: _cu, appearance: _a, ...keep } = (style || {}) as any;
  const block = keep.width === '100%' || keep.flex != null || !style;
  return (
    <Dropdown value={String(value ?? '')} onChange={(v) => onChange?.({ target: { value: v, name: rest.name, type: 'select-one' }, currentTarget: { value: v, name: rest.name } })} options={options} placeholder={placeholder}
      disabled={disabled} aria-label={rest['aria-label']} id={rest.id} block={block} style={{ ...keep, ...(block ? { width: keep.width ?? '100%' } : {}) }} />
  );
}
