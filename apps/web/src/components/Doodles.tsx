/**
 * Small hand-drawn touches that make the home page feel warm: a friendly
 * dog, floating stickers, a squiggle under words, soft waves between
 * sections and paw prints. Line art in the brand teal with soft pink;
 * purely decorative (hidden from screen readers), and still when the
 * visitor asks for reduced motion.
 */

const INK = '#1A8574';
const BLUSH = '#FBD5DE';

/** A friendly dog face peeking out, line art. `mood` tilts the head. */
export function DogDoodle({ className = '', mood = 'happy' }: { className?: string; mood?: 'happy' | 'curious' }) {
  return (
    <svg viewBox="0 0 140 120" className={className} aria-hidden="true" fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <g transform={mood === 'curious' ? 'rotate(-8 70 64)' : undefined}>
        {/* floppy ears */}
        <path d="M34 34c-14 4-22 22-18 40 2 8 12 8 15 1l9-26" fill="#EAF7F3" />
        <path d="M106 34c14 4 22 22 18 40-2 8-12 8-15 1l-9-26" fill="#EAF7F3" />
        {/* head */}
        <path d="M38 40c6-16 22-24 32-24s26 8 32 24c5 13 4 32-6 44-7 9-17 14-26 14s-19-5-26-14c-10-12-11-31-6-44z" fill="#fff" />
        {/* patch over one eye */}
        <path d="M80 44c8-2 15 4 15 12s-6 12-13 11" fill="#EAF7F3" stroke="none" />
        {/* eyes */}
        <circle cx="56" cy="56" r="4.2" fill={INK} stroke="none" />
        <circle cx="84" cy="56" r="4.2" fill={INK} stroke="none" />
        <circle cx="57.4" cy="54.6" r="1.3" fill="#fff" stroke="none" />
        <circle cx="85.4" cy="54.6" r="1.3" fill="#fff" stroke="none" />
        {/* cheeks */}
        <ellipse cx="47" cy="70" rx="6" ry="4" fill={BLUSH} stroke="none" />
        <ellipse cx="93" cy="70" rx="6" ry="4" fill={BLUSH} stroke="none" />
        {/* nose and smile */}
        <path d="M64 68c0-3 12-3 12 0s-4 6-6 6-6-3-6-6z" fill={INK} />
        <path d="M70 74v5M70 79c-3 5-10 5-12 0M70 79c3 5 10 5 12 0" />
        {/* tongue */}
        <path d="M66 82c0 7 8 7 8 0" fill="#F7A8B8" />
      </g>
    </svg>
  );
}

/** A paw print. */
export function Paw({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true" fill="currentColor">
      <circle cx="6" cy="9" r="2.2" /><circle cx="10" cy="5.5" r="2.2" /><circle cx="14" cy="5.5" r="2.2" /><circle cx="18" cy="9" r="2.2" />
      <path d="M12 10.5c-3 0-6 3.6-6 6.4 0 1.9 1.4 2.6 3 2.6 1.3 0 2-.6 3-.6s1.7.6 3 .6c1.6 0 3-.7 3-2.6 0-2.8-3-6.4-6-6.4z" />
    </svg>
  );
}

const STICKERS: Record<'heart' | 'ball', string> = {
  heart: 'M12 20.5l-1.2-1.1C6 15 3 12.3 3 8.8 3 6 5.2 4 7.9 4c1.6 0 3.1.8 4.1 2 1-1.2 2.5-2 4.1-2C18.8 4 21 6 21 8.8c0 3.5-3 6.2-7.8 10.6L12 20.5z',
  ball: 'M12 3a9 9 0 100 18 9 9 0 000-18zM4.5 9.5c4 1 11 1 15 0M4.5 14.5c4-1 11-1 15 0',
};

/** A round pastel sticker with a small drawing, gently floating. */
export function Sticker({ kind, className = '', delay = 0 }: { kind: 'heart' | 'ball' | 'bone' | 'paw'; className?: string; delay?: number }) {
  const tone = kind === 'heart' ? 'bg-rose-50 text-rose-400' : kind === 'bone' ? 'bg-lilac-50 text-lilac-600' : kind === 'ball' ? 'bg-sky-50 text-sky-500' : 'bg-teal-50 text-teal-600';
  return (
    <span aria-hidden="true" style={{ animationDelay: `${delay}ms` }}
      className={`absolute flex items-center justify-center rounded-full shadow-[0_8px_20px_-8px_rgba(36,48,58,0.25)] ring-4 ring-white motion-safe:animate-[bob_3.6s_ease-in-out_infinite] ${tone} ${className}`}>
      {kind === 'paw'
        ? <Paw className="w-1/2 h-1/2" />
        : kind === 'bone'
        ? <svg viewBox="0 0 24 24" className="w-1/2 h-1/2 -rotate-[30deg]" fill="currentColor"><circle cx="5.5" cy="9" r="2.7" /><circle cx="5.5" cy="15" r="2.7" /><circle cx="18.5" cy="9" r="2.7" /><circle cx="18.5" cy="15" r="2.7" /><rect x="5.5" y="9.4" width="13" height="5.2" rx="1.2" /></svg>
        : <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill={kind === 'ball' ? 'none' : 'currentColor'} stroke={kind === 'ball' ? 'currentColor' : 'none'} strokeWidth={2}><path d={STICKERS[kind]} /></svg>}
    </span>
  );
}

/** A hand-drawn line under a word or two. */
export function Squiggle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" className={className} aria-hidden="true" fill="none">
      <path d="M2 9c18-6 34-6 50-1s32 5 48 0 32-5 48 0 32 5 50-1" stroke="#F7A8B8" strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}

/**
 * A soft wave where one section meets the next. `color` is the colour of
 * the section it leads into; `flip` turns it upside down for the bottom edge.
 */
export function Wave({ color, flip = false, className = '' }: { color: string; flip?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 1440 56" preserveAspectRatio="none" className={`block w-full h-8 sm:h-12 ${flip ? 'rotate-180' : ''} ${className}`} aria-hidden="true">
      <path d="M0 32c120-20 240-28 360-20s240 30 360 30 240-22 360-26 240 8 360 16v44H0z" fill={color} />
    </svg>
  );
}

/** A few faint paw prints scattered behind a section. */
export function PawField({ className = '' }: { className?: string }) {
  const prints: [number, number, number, number][] = [[6, 18, -20, 22], [12, 70, 15, 18], [88, 14, 25, 20], [93, 62, -10, 24], [50, 90, 5, 16]];
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {prints.map(([x, y, r, s], i) => (
        <Paw key={i} className="absolute text-teal-100" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, transform: `rotate(${r}deg)` }} />
      ))}
    </span>
  );
}
