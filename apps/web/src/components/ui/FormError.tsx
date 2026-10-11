'use client';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { Icon } from './icons';

/**
 * The one way the site says what's wrong. FieldError sits under a field;
 * FormAlert sits above a form's buttons. Both are announced by screen
 * readers and look the same everywhere.
 */
export function FieldError({ id, message, className = '' }: { id?: string; message?: string | null; className?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={`mt-1.5 flex items-start gap-1.5 px-1 text-[11.5px] leading-snug font-medium text-red-500 animate-[fadeUp_0.15s_ease-out] ${className}`}>
      <Icon name="alert" className="w-3.5 h-3.5 mt-px shrink-0" strokeWidth={2.2} />
      <span>{message}</span>
    </p>
  );
}

/**
 * A form-level message: a server error, or "N required fields are empty"
 * when `missing` is given (and no `message`).
 */
export function FormAlert({ message, missing, className = '' }: { message?: string | null; missing?: number; className?: string }) {
  const { t } = useLanguage();
  const text = message || (missing ? fill(t(missing === 1 ? 'ui.e.missingOne' : 'ui.e.missing'), { n: missing }) : '');
  if (!text) return null;
  return (
    <div role="alert" className={`flex items-start gap-2.5 rounded-2xl bg-red-50 ring-1 ring-red-100 px-4 py-3 text-[12.5px] leading-snug text-red-700 animate-[fadeUp_0.15s_ease-out] ${className}`}>
      <span className="w-6 h-6 -my-0.5 shrink-0 rounded-full bg-red-100 text-red-500 flex items-center justify-center"><Icon name="alert" className="w-3.5 h-3.5" strokeWidth={2.2} /></span>
      <span className="pt-px">{text}</span>
    </div>
  );
}

/** How many entries of an errors object are set. */
export const countErrors = (errs: Record<string, unknown>) => Object.values(errs).filter(Boolean).length;

/**
 * After a submit that failed checks: scroll to the first field marked
 * aria-invalid (inside `root`, e.g. a pop-up) and put the cursor there.
 * Runs once React has drawn the errors (a timer, not an animation frame,
 * so it also runs in a tab that isn't being painted).
 */
export function revealFirstError(root?: HTMLElement | null) {
  setTimeout(() => {
    const el = (root ?? document).querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.focus({ preventScroll: true });
  }, 0);
}
