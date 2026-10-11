'use client';
import { FieldError } from './FormError';

/**
 * A text field with the label inside it: it sits in the middle while the
 * field is empty and moves up small once you focus or type — no separate
 * static title above every box. Filled style: a soft background, no outline.
 */
export default function Field({ id, label, value, onChange, type = 'text', error, hint, disabled, autoComplete, required, inputMode, maxLength, trailing }: {
  id: string;
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  autoComplete?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
  /** A small icon at the right edge (e.g. a ✓ for a confirmed value). */
  trailing?: React.ReactNode;
}) {
  return (
    <div>
      <div className="relative">
        <input id={id} type={type} value={value} placeholder=" " disabled={disabled} autoComplete={autoComplete} inputMode={inputMode} maxLength={maxLength}
          aria-invalid={!!error} aria-describedby={error || hint ? `${id}-note` : undefined} required={required}
          onChange={(e) => onChange?.(e.target.value)}
          className={`peer block w-full h-12 rounded-xl px-3.5 pt-4 pb-1 ${trailing ? 'pr-10' : ''} text-[13px] text-gray-900 outline-none transition-colors
            disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? 'bg-red-50 focus:bg-white focus:ring-2 focus:ring-red-300' : 'bg-gray-100/80 hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-teal-300'}`} />
        {/* Sits in the middle while empty; on focus or with a value it moves up small. */}
        <label htmlFor={id}
          className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400 transition-all duration-150
            peer-focus:top-[13px] peer-focus:text-[10.5px] peer-focus:font-medium peer-focus:text-teal-700
            peer-[:not(:placeholder-shown)]:top-[13px] peer-[:not(:placeholder-shown)]:text-[10.5px] peer-[:not(:placeholder-shown)]:text-gray-500
            ${error ? 'text-red-400 peer-focus:text-red-500' : ''}`}>
          {label}{required ? <span className="text-red-400"> *</span> : null}
        </label>
        {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
      {error ? <FieldError id={`${id}-note`} message={error} /> : hint ? <p id={`${id}-note`} className="mt-1 px-1 text-[11.5px] text-gray-500">{hint}</p> : null}
    </div>
  );
}
