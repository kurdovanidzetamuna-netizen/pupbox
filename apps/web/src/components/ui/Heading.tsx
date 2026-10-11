/**
 * The site's one type scale and title spacing. Every page title, section
 * title and form title goes through these, so sizes and gaps match
 * everywhere. Compact on purpose: Georgian letters already read large.
 *
 *   hero     30 → 36px   (home only)
 *   page     24 → 28px   h1 at the top of a page
 *   section  20 → 22px   h2 for a block within a page
 *   form     20px        sign-in, sign-up, checkout steps, small cards
 *   subtitle 13 → 14px   grey, 6px under its title
 */
export const TYPE = {
  hero: 'text-[30px] sm:text-[36px] font-extrabold tracking-tight leading-[1.15] text-gray-900',
  page: 'text-2xl sm:text-[28px] font-extrabold tracking-tight leading-tight text-gray-900',
  section: 'text-xl sm:text-[22px] font-bold tracking-tight leading-snug text-gray-900',
  form: 'text-xl font-bold tracking-tight leading-snug text-gray-900',
  subtitle: 'text-[13px] sm:text-sm leading-relaxed text-gray-500',
  eyebrow: 'inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal-700',
} as const;

/** Space between a title block and what follows, by kind. */
const GAP = { hero: 'mb-4', page: 'mb-6 sm:mb-8', section: 'mb-5 sm:mb-6', form: 'mb-5' } as const;

type Kind = 'hero' | 'page' | 'section' | 'form';

/**
 * A title with its optional small label above, subtitle below, and actions
 * at the side (left-aligned only). `kind` sets size and the gap below.
 */
export function Heading({ kind = 'page', as, title, subtitle, eyebrow, align = 'left', actions, className = '', id }: {
  kind?: Kind;
  /** The HTML tag; defaults to h1 for hero/page, h2 otherwise. */
  as?: 'h1' | 'h2' | 'h3';
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  align?: 'left' | 'center';
  actions?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const Tag = as ?? (kind === 'hero' || kind === 'page' ? 'h1' : 'h2');
  const center = align === 'center';
  const text = (
    <div className={`min-w-0 ${center ? 'mx-auto max-w-2xl text-center' : ''}`}>
      {eyebrow && <span className={`${TYPE.eyebrow} mb-3`}>{eyebrow}</span>}
      <Tag id={id} className={`${TYPE[kind]} [overflow-wrap:anywhere]`}>{title}</Tag>
      {subtitle && <p className={`${TYPE.subtitle} mt-1.5 ${center ? '' : 'max-w-2xl'}`}>{subtitle}</p>}
    </div>
  );
  return (
    <div className={`${GAP[kind]} ${className}`}>
      {actions && !center ? (
        <div className="flex items-start justify-between gap-4">{text}<div className="shrink-0 flex items-center gap-2">{actions}</div></div>
      ) : text}
    </div>
  );
}

/** Vertical rhythm for a page's blocks: the same padding everywhere. */
export const SECTION_Y = 'py-12 sm:py-14';
/** Space between the site header and a page's first title. */
export const PAGE_TOP = 'pt-8 sm:pt-10 pb-14';
