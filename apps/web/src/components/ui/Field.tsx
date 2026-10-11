'use client';

/**
 * A text field with the label inside it: it sits in the middle while the
 * field is empty and floats up small once you type or focus — no separate
 * static title above every box.
 */
export default function Field({ id, label, value, onChange, type = 'text', error, hint, disabled, autoComplete, required, inputMode, maxLength }: {
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
}) {
  return (
    <div>
      <div className="relative">
        <input id={id} type={type} value={value} placeholder=" " disabled={disabled} autoComplete={autoComplete} inputMode={inputMode} maxLength={maxLength}
          aria-invalid={!!error} aria-describedby={error || hint ? `${id}-note` : undefined} required={required}
          onChange={(e) => onChange?.(e.target.value)}
          className={`peer block w-full h-14 rounded-2xl px-4 pt-5 pb-1.5 text-[15px] text-gray-900 bg-white outline-none transition
            ring-1 focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500
            ${error ? 'ring-red-300 focus:ring-red-400' : 'ring-gray-200 hover:ring-gray-300 focus:ring-teal-400'}`} />
        <label htmlFor={id}
          className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-gray-400 transition-all duration-150
            peer-focus:top-4 peer-focus:text-xs peer-focus:text-teal-700
            peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:text-xs
            ${error ? 'peer-focus:text-red-500' : ''}`}>
          {label}{required ? ' *' : ''}
        </label>
      </div>
      {(error || hint) && <p id={`${id}-note`} className={`mt-1.5 px-1 text-xs ${error ? 'text-red-500' : 'text-gray-500'}`}>{error || hint}</p>}
    </div>
  );
}
