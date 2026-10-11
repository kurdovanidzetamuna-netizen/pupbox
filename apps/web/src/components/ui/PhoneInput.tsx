'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { useLanguage } from '@/context/LanguageContext';

/** Countries most Pupbox customers come from, shown first; Georgia is the default. */
const TOP: CountryCode[] = ['GE', 'TR', 'AM', 'AZ', 'UA', 'RU', 'IL', 'DE', 'GB', 'US'];
/** Georgian names for the countries people pick most (browsers often lack them). */
const KA: Record<string, string> = {
  GE: 'საქართველო', TR: 'თურქეთი', AM: 'სომხეთი', AZ: 'აზერბაიჯანი', UA: 'უკრაინა', RU: 'რუსეთი', IL: 'ისრაელი',
  DE: 'გერმანია', GB: 'გაერთიანებული სამეფო', US: 'ამერიკის შეერთებული შტატები', FR: 'საფრანგეთი', IT: 'იტალია',
  ES: 'ესპანეთი', PL: 'პოლონეთი', GR: 'საბერძნეთი', NL: 'ნიდერლანდები', BE: 'ბელგია', AT: 'ავსტრია', CH: 'შვეიცარია',
  SE: 'შვედეთი', NO: 'ნორვეგია', FI: 'ფინეთი', DK: 'დანია', IE: 'ირლანდია', PT: 'პორტუგალია', CZ: 'ჩეხეთი',
  LT: 'ლიტვა', LV: 'ლატვია', EE: 'ესტონეთი', BY: 'ბელარუსი', MD: 'მოლდოვა', RO: 'რუმინეთი', BG: 'ბულგარეთი',
  HU: 'უნგრეთი', KZ: 'ყაზახეთი', UZ: 'უზბეკეთი', IR: 'ირანი', IN: 'ინდოეთი', CN: 'ჩინეთი', JP: 'იაპონია',
  KR: 'სამხრეთ კორეა', AE: 'არაბთა გაერთიანებული საამიროები', SA: 'საუდის არაბეთი', EG: 'ეგვიპტე', CA: 'კანადა',
  AU: 'ავსტრალია', BR: 'ბრაზილია', CY: 'კვიპროსი', SK: 'სლოვაკეთი', SI: 'სლოვენია', HR: 'ხორვატია', RS: 'სერბეთი',
};
const flag = (c: string) => String.fromCodePoint(...[...c.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

/** Splits a stored international number into its country and national part. */
export function splitPhone(value: string | null | undefined): { country: CountryCode; national: string } {
  const p = value ? parsePhoneNumberFromString(value, 'GE') : undefined;
  // Shared codes (+44 is also Guernsey, +1 Canada…) show the main country.
  const main = p && TOP.find((c) => getCountryCallingCode(c) === p.countryCallingCode);
  const country = p?.country && !TOP.includes(p.country) && main ? main : p?.country;
  return country ? { country, national: p!.nationalNumber } : { country: 'GE', national: (value ?? '').replace(/^\+995/, '') };
}

/** Is this a real number for that country? */
export function isValidPhone(value: string) {
  const p = parsePhoneNumberFromString(value ?? '', 'GE');
  return !!p && p.isValid();
}

/**
 * A phone field for any country: a country picker (flag + dialling code,
 * searchable, Georgia first) and the number. Reports the full international
 * number (+995599123456) and whether it's valid for that country.
 */
export default function PhoneInput({ id, value, onChange, label, error, autoFocus, required, trailing, floatLabel }: {
  id: string;
  value: string;
  onChange: (international: string, valid: boolean) => void;
  label: string;
  error?: string;
  autoFocus?: boolean;
  required?: boolean;
  /** Something at the right edge, e.g. a submit button or a ✓. */
  trailing?: React.ReactNode;
  /** Label inside the field, moving up small (like Field) instead of a placeholder. */
  floatLabel?: boolean;
}) {
  const { lang } = useLanguage();
  const start = useMemo(() => splitPhone(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<CountryCode>(start.country);
  const [national, setNational] = useState(start.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);

  const names = useMemo(() => {
    let en: Intl.DisplayNames | null = null;
    let ka: Intl.DisplayNames | null = null;
    try { en = new Intl.DisplayNames(['en'], { type: 'region' }); ka = new Intl.DisplayNames(['ka'], { type: 'region' }); } catch {}
    const all = getCountries().map((c) => {
      const enName = en?.of(c) ?? c;
      const kaRaw = ka?.of(c);
      // Browsers without Georgian data hand back the English name.
      const kaName = KA[c] ?? (kaRaw && kaRaw !== enName ? kaRaw : enName);
      return { code: c, dial: getCountryCallingCode(c), name: lang === 'ka' ? kaName : enName, alt: `${enName} ${kaName}`.toLowerCase() };
    });
    const top = TOP.map((c) => all.find((x) => x.code === c)!).filter(Boolean);
    const rest = all.filter((x) => !TOP.includes(x.code)).sort((a, b) => a.name.localeCompare(b.name, lang === 'ka' ? 'ka' : 'en'));
    return { top, rest };
  }, [lang]);

  const q = query.trim().toLowerCase().replace(/^\+/, '');
  const match = (x: { code: string; dial: string; alt: string }) => !q || x.alt.includes(q) || x.dial.startsWith(q) || x.code.toLowerCase() === q;

  function emit(c: CountryCode, n: string) {
    const digits = n.replace(/\D/g, '');
    // Read it as that country's number, so a trunk 0 (07911…) is dropped.
    const p = digits ? parsePhoneNumberFromString(digits, c) : undefined;
    const full = p ? p.number : `+${getCountryCallingCode(c)}${digits}`;
    onChange(digits ? full : '', !!p && p.isValid() && p.countryCallingCode === getCountryCallingCode(c));
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const pick = (c: CountryCode) => { setCountry(c); setOpen(false); setQuery(''); emit(c, national); document.getElementById(id)?.focus(); };
  const item = (x: { code: CountryCode; dial: string; name: string; alt: string }) => (
    <button key={x.code} type="button" role="option" aria-selected={x.code === country} onClick={() => pick(x.code)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left hover:bg-gray-50 ${x.code === country ? 'bg-teal-50 text-teal-800' : 'text-gray-700'}`}>
      <span className="text-base leading-none">{flag(x.code)}</span>
      <span className="flex-1 truncate">{x.name}</span>
      <span className="text-gray-400 tabular-nums">+{x.dial}</span>
    </button>
  );

  const input = (
    <input id={id} type="tel" inputMode="tel" autoFocus={autoFocus} value={national} autoComplete="tel-national" aria-invalid={!!error}
      placeholder={floatLabel ? ' ' : country === 'GE' ? '5XX XX XX XX' : label + (required ? ' *' : '')} aria-label={label}
      onChange={(e) => {
        const v = e.target.value;
        // Pasting a full +number switches the country to match it.
        if (v.trim().startsWith('+')) {
          const p = parsePhoneNumberFromString(v);
          if (p?.country) { const sp = splitPhone(p.number); setCountry(sp.country); setNational(sp.national); emit(sp.country, sp.national); return; }
        }
        const clean = v.replace(/[^\d\s()-]/g, '').slice(0, 18);
        setNational(clean); emit(country, clean);
      }}
      className={`${floatLabel ? 'peer w-full h-full pt-4 pb-1 text-[13px]' : 'flex-1 min-w-0 text-[14px]'} bg-transparent outline-none tracking-wide text-gray-900 placeholder:text-gray-400`} />
  );

  return (
    <div ref={box} className="relative">
      <div className={`flex items-center h-12 rounded-xl transition-colors pr-1.5 ${error ? 'bg-red-50' : 'bg-gray-100/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-300'}`}>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={label}
          className="h-full flex items-center gap-1.5 pl-3.5 pr-2.5 mr-2.5 border-r border-gray-300/70 text-[13px] font-semibold text-gray-600 hover:text-gray-900 shrink-0">
          <span className="text-base leading-none">{flag(country)}</span>+{getCountryCallingCode(country)}
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {floatLabel ? (
          <div className="relative flex-1 min-w-0 h-full">
            {input}
            <label htmlFor={id}
              className={`pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[13px] text-gray-400 transition-all duration-150
                peer-focus:top-[13px] peer-focus:text-[10.5px] peer-focus:font-medium peer-focus:text-teal-700
                peer-[:not(:placeholder-shown)]:top-[13px] peer-[:not(:placeholder-shown)]:text-[10.5px] peer-[:not(:placeholder-shown)]:text-gray-500
                ${error ? 'text-red-400 peer-focus:text-red-500' : ''}`}>
              {label}{required ? <span className="text-red-400"> *</span> : null}
            </label>
          </div>
        ) : input}
        {trailing}
      </div>
      {error && <p className="mt-1 px-1 text-[11.5px] text-red-500">{error}</p>}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-full sm:w-80 rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_8px_30px_-10px_rgba(36,48,58,0.25)] p-1.5 animate-[fadeUp_0.12s_ease-out]">
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === 'ka' ? 'ქვეყანა ან კოდი…' : 'Country or code…'}
            className="w-full h-9 mb-1 rounded-lg bg-gray-100/80 px-3 text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-teal-300" />
          <div role="listbox" className="max-h-64 overflow-y-auto">
            {names.top.filter(match).map(item)}
            {!q && <div className="my-1 border-t border-gray-100" />}
            {names.rest.filter(match).map(item)}
          </div>
        </div>
      )}
    </div>
  );
}
