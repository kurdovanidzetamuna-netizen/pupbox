'use client';
import React from 'react';

interface FormFieldProps {
  label: React.ReactNode;
  required?: boolean;
  error?: string;
  children: React.ReactElement;
  hint?: string;
}

export const inputClass = (error?: string): React.CSSProperties => ({
  width: '100%',
  padding: '9px 12px',
  fontSize: 13,
  border: `1px solid ${error ? '#fca5a5' : '#e2e8f0'}`,
  borderRadius: 10,
  outline: 'none',
  background: error ? '#fff5f5' : '#fff',
  boxSizing: 'border-box' as const,
  color: '#0f172a',
});

export function parseFieldErrors(message: string | string[]): Record<string, string> {
  const msgs = Array.isArray(message) ? message : [message];
  const map: Record<string, string> = {};
  msgs.forEach(m => {
    const lower = m.toLowerCase();
    const fieldMap: [string, string[]][] = [
      ['name', ['name ']],
      ['slug', ['slug ']],
      ['sku', ['sku ']],
      ['price', ['price ']],
      ['salePrice', ['saleprice ', 'sale price']],
      ['description', ['description ']],
      ['shortDescription', ['shortdescription ', 'short description']],
      ['categoryId', ['categoryid ']],
      ['brand', ['brand ']],
      ['title', ['title ']],
      ['excerpt', ['excerpt ']],
      ['content', ['content ']],
      ['code', ['code ']],
      ['discountValue', ['discountvalue ', 'discount value']],
      ['durationValue', ['durationvalue ']],
      ['boxCount', ['boxcount ']],
    ];
    for (const [field, patterns] of fieldMap) {
      if (patterns.some(p => lower.includes(p))) {
        map[field] = m;
        return;
      }
    }
    // fallback: store under '_general'
    map['_general'] = map['_general'] ? map['_general'] + '; ' + m : m;
  });
  return map;
}

export default function FormField({ label, required, error, children, hint }: FormFieldProps) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: error ? '#dc2626' : '#475569', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {required && <span style={{ color: '#dc2626', fontSize: 13, lineHeight: 1 }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
          <span>⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{hint}</p>
      )}
    </div>
  );
}
