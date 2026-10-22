'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/context/LanguageContext';
import { FieldError } from './FormError';
import { Icon } from './icons';

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ka: ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'],
};
const DAYS = { en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], ka: ['ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა', 'კვ'] };

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const parse = (v: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || ''); return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null; };
const todayIso = () => { const n = new Date(); return iso(n.getFullYear(), n.getMonth(), n.getDate()); };

/**
 * A date field that opens a calendar pop-up — the same soft filled look as
 * Field, with the label inside. The calendar shows a month at a time; tap
 * the month name to jump by year, then month (quick for a birthday years
 * ago). Closes on a pick, outside click or Esc (Esc closes only the
 * calendar, not the pop-up it sits in). `value` is YYYY-MM-DD or ''.
 */
export default function DatePicker({ id, label, value, onChange, hint, error, required, min, max, startView = 'days' }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  /** YYYY-MM-DD bounds; days outside them can't be picked. */
  min?: string;
  max?: string;
  /** Birthdays start on the years, so a dog born in 2019 is two taps away. */
  startView?: 'days' | 'years';
}) {
  const { t, lang } = useLanguage();
  const L = lang === 'ka' ? 'ka' : 'en';
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const sel = parse(value);
  const base = sel ?? parse(max && max < todayIso() ? max : min && min > todayIso() ? min : todayIso())!;
  const [cursor, setCursor] = useState({ y: base.y, m: base.m });
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);

  function show() {
    const b = parse(value) ?? base;
    setCursor({ y: b.y, m: b.m });
    setView(!value && startView === 'years' ? 'years' : 'days');
    setOpen(true);
  }

  // Stay attached to the field while the page or the pop-up around it scrolls.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = trigger.current?.getBoundingClientRect();
      if (!r) return;
      const w = 300, h = pop.current?.offsetHeight ?? 360;
      const up = r.bottom + h + 8 > window.innerHeight && r.top - h - 8 > 0;
      setPos({ top: up ? r.top - h - 6 : r.bottom + 6, left: Math.min(Math.max(8, r.left), window.innerWidth - w - 8), up });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, view]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const n = e.target as Node;
      if (!pop.current?.contains(n) && !trigger.current?.contains(n)) setOpen(false);
    };
    // Capture on window so Esc closes the calendar before the pop-up around it hears it.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey, true); };
  }, [open]);

  const allowed = (v: string) => (!min || v >= min) && (!max || v <= max);
  const pick = (d: number) => { onChange(iso(cursor.y, cursor.m, d)); setOpen(false); trigger.current?.focus(); };
  const shift = (n: number) => setCursor(({ y, m }) => {
    if (view === 'years') return { y: y + n * 12, m };
    if (view === 'months') return { y: y + n, m };
    const k = y * 12 + m + n;
    return { y: Math.floor(k / 12), m: ((k % 12) + 12) % 12 };
  });

  const shown = sel ? `${sel.d} ${MONTHS[L][sel.m]} ${sel.y}` : '';
  const today = todayIso();
  const first = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7; // Monday first
  const count = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const yearFrom = cursor.y - (cursor.y % 12);
  const title = view === 'days' ? `${MONTHS[L][cursor.m]} ${cursor.y}` : view === 'months' ? `${cursor.y}` : `${yearFrom} – ${yearFrom + 11}`;
  const cell = 'rounded-xl text-[13px] font-semibold transition-colors disabled:text-gray-300 disabled:hover:bg-transparent';

  return (
    <div>
      <div className="relative">
        <button ref={trigger} id={id} type="button" onClick={() => (open ? setOpen(false) : show())} aria-haspopup="dialog" aria-expanded={open}
          aria-invalid={!!error} aria-describedby={error || hint ? `${id}-note` : undefined}
          className={`peer w-full h-12 rounded-xl pl-3.5 pr-10 text-left transition-colors outline-none focus-visible:ring-2 ${
            error ? 'bg-red-50 focus-visible:ring-red-300' : open ? 'bg-white ring-2 ring-teal-300' : 'bg-gray-100/80 hover:bg-gray-100 focus-visible:ring-teal-300'}`}>
          {/* The label sits in the middle while empty and moves up small once there's a date — like Field. */}
          <span className={`block transition-all duration-150 ${shown ? 'text-[10.5px] font-medium text-gray-500 leading-none pt-0.5' : 'text-[13px] text-gray-400'} ${error ? '!text-red-400' : ''}`}>
            {label}{required ? <span className="text-red-400"> *</span> : null}
          </span>
          {shown && <span className="block mt-1 text-[13px] text-gray-900 leading-none">{shown}</span>}
        </button>
        <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${open ? 'text-teal-600' : 'text-gray-400'}`}><Icon name="calendar" className="w-[18px] h-[18px]" /></span>
      </div>
      {error ? <FieldError id={`${id}-note`} message={error} /> : hint ? <p id={`${id}-note`} className="mt-1 px-1 text-[11.5px] text-gray-500">{hint}</p> : null}

      {open && createPortal(
        <div ref={pop} role="dialog" aria-label={label} data-datepicker
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? 0, width: 300 }}
          className="z-[90] rounded-3xl bg-white ring-1 ring-gray-200/80 shadow-[0_16px_40px_-14px_rgba(36,48,58,0.35)] p-3 animate-[fadeUp_0.15s_ease-out]">
          {/* Month (or year range) in the middle — tap it to zoom out; round arrows either side */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <button type="button" onClick={() => shift(-1)} aria-label="‹" className="w-9 h-9 rounded-full inline-flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900">
              <Icon name="back" className="w-4 h-4" strokeWidth={2.2} />
            </button>
            <button type="button" onClick={() => setView(view === 'days' ? 'years' : view === 'years' ? 'months' : 'days')}
              className="h-9 px-3 rounded-full inline-flex items-center gap-1 text-[14px] font-bold text-gray-900 hover:bg-teal-50 hover:text-teal-800">
              {title}
              <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${view === 'days' ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <button type="button" onClick={() => shift(1)} aria-label="›" className="w-9 h-9 rounded-full inline-flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900">
              <Icon name="arrow" className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>

          {view === 'days' && (
            <>
              <div className="grid grid-cols-7 mb-1">
                {DAYS[L].map((d) => <span key={d} className="h-7 flex items-center justify-center text-[11px] font-bold text-gray-400">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: first }, (_, i) => <span key={`e${i}`} />)}
                {Array.from({ length: count }, (_, i) => {
                  const d = i + 1, v = iso(cursor.y, cursor.m, d);
                  const on = v === value, now = v === today;
                  return (
                    <button key={d} type="button" onClick={() => pick(d)} disabled={!allowed(v)} aria-pressed={on} aria-label={`${d} ${MONTHS[L][cursor.m]} ${cursor.y}`}
                      className={`${cell} h-9 ${on ? 'bg-teal-600 text-white hover:bg-teal-700' : now ? 'text-teal-700 ring-1 ring-inset ring-teal-300 hover:bg-teal-50' : 'text-gray-700 hover:bg-teal-50 hover:text-teal-800'}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {view === 'years' && (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => yearFrom + i).map((y) => {
                const off = (min && `${y}-12-31` < min) || (max && `${y}-01-01` > max);
                return (
                  <button key={y} type="button" disabled={!!off} onClick={() => { setCursor((c) => ({ ...c, y })); setView('months'); }}
                    className={`${cell} h-11 ${sel?.y === y ? 'bg-teal-600 text-white hover:bg-teal-700' : 'text-gray-700 bg-gray-50 hover:bg-teal-50 hover:text-teal-800'}`}>{y}</button>
                );
              })}
            </div>
          )}

          {view === 'months' && (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS[L].map((name, m) => {
                const off = (min && iso(cursor.y, m, new Date(cursor.y, m + 1, 0).getDate()) < min) || (max && iso(cursor.y, m, 1) > max);
                return (
                  <button key={name} type="button" disabled={!!off} onClick={() => { setCursor((c) => ({ ...c, m })); setView('days'); }}
                    className={`${cell} h-11 px-1 text-[12px] ${sel?.y === cursor.y && sel?.m === m ? 'bg-teal-600 text-white hover:bg-teal-700' : 'text-gray-700 bg-gray-50 hover:bg-teal-50 hover:text-teal-800'}`}>{name}</button>
                );
              })}
            </div>
          )}

          {value && !required && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
              <button type="button" onClick={() => { onChange(''); setOpen(false); }}
                className="h-8 px-3 rounded-full text-[12.5px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800">{t('ui.clear')}</button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
