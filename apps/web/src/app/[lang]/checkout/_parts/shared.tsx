'use client';
import type { Pin } from '@/components/MapPicker';
import { FieldError } from '@/components/ui/FormError';
import { Icon } from '@/components/ui/icons';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export type StepKey = 'account' | 'dog' | 'gift' | 'delivery';

export type SavedAddress = { id: string; label: string | null; firstName: string; lastName: string; phone: string; city: string; addressLine1: string; addressLine2: string | null; latitude: number | null; longitude: number | null; isDefault: boolean; isGift: boolean };

/** The form (and pin) still say exactly what this saved address says. */
export function sameAddress(a: SavedAddress, f: { firstName: string; lastName: string; phone: string; city: string; addressLine1: string; addressLine2: string }, pin: Pin | null) {
  const eq = (x: string | null | undefined, y: string) => (x ?? '').trim() === y.trim();
  return eq(a.firstName, f.firstName) && eq(a.lastName, f.lastName) && eq(a.phone, f.phone) && eq(a.city, f.city)
    && eq(a.addressLine1, f.addressLine1) && eq(a.addressLine2, f.addressLine2)
    && (!pin || (pin.lat === a.latitude && pin.lng === a.longitude));
}

/**
 * Label, control and its message. Defined at module level on purpose: a
 * component declared inside the page is a new type on every render, which
 * remounts the input and drops focus after each keystroke.
 */
export function Field({ id, label, hint, error, required, children }: { id: string; label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block px-1 mb-1.5 text-[12.5px] font-semibold text-gray-700">{label}{required && <span className="text-red-400"> *</span>}</label>
      {children}
      {error ? <FieldError message={error} /> : hint ? <p className="mt-1 px-1 text-[11.5px] text-gray-500">{hint}</p> : null}
    </div>
  );
}

/** A choice card (delivery method, renewal): soft, with a tick when chosen. */
export function OptionCard({ name, checked, onChange, invalid, children }: { name: string; checked: boolean; onChange: () => void; invalid?: boolean; children: React.ReactNode }) {
  return (
    <label className={`relative flex items-center gap-3 rounded-[18px] px-4 py-3.5 cursor-pointer ring-1 ring-inset transition ${checked ? 'bg-teal-50 ring-teal-400' : invalid ? 'bg-red-50 ring-red-300' : 'bg-gray-100/70 ring-transparent hover:bg-gray-100'}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center transition ${checked ? 'bg-teal-600 text-white' : 'bg-white ring-1 ring-gray-300'}`} aria-hidden="true">
        {checked && <Icon name="check" className="w-3 h-3" strokeWidth={3.2} />}
      </span>
      {children}
    </label>
  );
}

/**
 * Checkout in at most three steps: account (skipped when already signed in),
 * the dog (or the gift recipient; skipped for products-only orders), then
 * delivery and payment on one screen. Asking for less — and nothing twice —
 * is the whole point: every extra step is somewhere a customer can leave.
 */
/** Dates for the gift start picker, in Tbilisi time (UTC+4) to match the server. */
export const tbilisiDay = (offsetDays = 0) => new Date(Date.now() + 4 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10);
export const todayTbilisi = () => tbilisiDay(0);
export const tomorrowTbilisi = () => tbilisiDay(1);
export const inAYear = () => tbilisiDay(365);
