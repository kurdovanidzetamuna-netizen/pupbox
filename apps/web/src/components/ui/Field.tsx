'use client';

/**
 * A text field with the label inside it: it sits in the middle while the
 * field is empty and moves onto the top border once you focus or type —
 * no separate static title above every box.
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
          className={`peer block w-full h-11 rounded-xl px-3.5 ${trailing ? 'pr-10' : ''} text-sm text-gray-900 bg-white outline-none transition
            ring-1 focus:ring-2 disabled:bg-gray-50/60 disabled:text-gray-500
            ${error ? 'ring-red-300 focus:ring-red-400' : 'ring-gray-200 hover:ring-gray-300 focus:ring-teal-400'}`} />
        {/* Sits inside while empty; on focus or with a value it moves onto the border. */}
        <label htmlFor={id}
          className={`pointer-events-none absolute left-2.5 px-1 top-1/2 -translate-y-1/2 text-sm text-gray-400 bg-white rounded transition-all duration-150
            peer-focus:top-0 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-teal-700
            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:text-gray-500
            peer-disabled:bg-transparent peer-disabled:peer-[:not(:placeholder-shown)]:bg-white
            ${error ? 'peer-focus:text-red-500' : ''}`}>
          {label}{required ? ' *' : ''}
        </label>
        {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
      {(error || hint) && <p id={`${id}-note`} className={`mt-1 px-1 text-xs ${error ? 'text-red-500' : 'text-gray-500'}`}>{error || hint}</p>}
    </div>
  );
}
