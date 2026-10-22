'use client';
import type { CSSProperties } from 'react';
import { Select } from './Dropdown';

const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

/** A time of day (HH:MM) from a list in half hours — never the browser's own time box. */
export default function TimeInput({ value, onChange, disabled, style, 'aria-label': ariaLabel }: {
  value: string; onChange: (e: any) => void; disabled?: boolean; style?: CSSProperties; 'aria-label'?: string;
}) {
  const list = TIMES.includes(value) || !value ? TIMES : [...TIMES, value].sort();
  return (
    <Select value={value} disabled={disabled} aria-label={ariaLabel} onChange={(e: any) => onChange({ target: { value: e.target.value } })} style={{ minWidth: 96, ...style }}>
      {list.map((t) => <option key={t} value={t}>{t}</option>)}
    </Select>
  );
}
