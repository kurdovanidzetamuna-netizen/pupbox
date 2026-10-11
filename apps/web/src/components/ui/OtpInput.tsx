'use client';
import { useRef } from 'react';

/**
 * Six one-digit boxes for a verification code. Typing moves to the next box,
 * Backspace to the previous, and pasting a whole code fills them all. Calls
 * `onComplete` as soon as all six digits are in (no button needed).
 */
export default function OtpInput({ value, onChange, onComplete, disabled, error, label }: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
  label: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  function set(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, 6);
    onChange(clean);
    if (clean.length === 6) onComplete?.(clean);
    refs.current[Math.min(clean.length, 5)]?.focus();
  }

  return (
    <div role="group" aria-label={label} className="flex gap-2">
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} disabled={disabled}
          inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={6} aria-label={`${label} ${i + 1}`}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, '');
            if (!typed) return;
            // A paste (or SMS autofill) brings several digits at once.
            set(typed.length > 1 ? typed : value.slice(0, i) + typed + value.slice(i + 1));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault();
              const at = d ? i : i - 1;
              if (at < 0) return;
              onChange(value.slice(0, at) + value.slice(at + 1));
              refs.current[at]?.focus();
            } else if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus();
            else if (e.key === 'ArrowRight') refs.current[i + 1]?.focus();
          }}
          className={`w-10 h-12 sm:w-11 sm:h-12 rounded-xl text-center text-lg font-semibold text-gray-900 outline-none transition-colors caret-teal-600
            ${error ? 'bg-red-50 ring-1 ring-red-200' : d ? 'bg-teal-50 ring-1 ring-teal-200' : 'bg-gray-100/80'} focus:bg-white focus:ring-2 focus:ring-teal-300 disabled:opacity-50`} />
      ))}
    </div>
  );
}
