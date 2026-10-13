'use client';
import { useId } from 'react';

/**
 * Glossy 3D icons in the style of Airbnb's newer ones: soft gradients, a
 * shine on top and a soft shadow under, drawn edge to edge so they fill
 * their space with no tile around them. Decorative: hidden from screen readers.
 */

type P = { className?: string };

/** Linear gradient from top-left to bottom-right (or as given), in drawing units. */
function Lin({ id, from, to, x1 = 20, y1 = 10, x2 = 100, y2 = 110 }: { id: string; from: string; to: string; x1?: number; y1?: number; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
      <stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} />
    </linearGradient>
  );
}
/** A round light falling from the top left. */
function Rad({ id, light, mid, dark, cx = 0.35, cy = 0.3 }: { id: string; light: string; mid: string; dark: string; cx?: number; cy?: number }) {
  return (
    <radialGradient id={id} cx={cx} cy={cy} r="0.8">
      <stop offset="0" stopColor={light} /><stop offset="0.55" stopColor={mid} /><stop offset="1" stopColor={dark} />
    </radialGradient>
  );
}

function Svg({ className, children }: P & { children: (u: (s: string) => string) => React.ReactNode }) {
  const base = useId().replace(/:/g, '');
  const u = (s: string) => `${base}${s}`;
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <filter id={u('blur')} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      {children(u)}
    </svg>
  );
}
const Shadow = ({ u, y = 110, rx = 40 }: { u: (s: string) => string; y?: number; rx?: number }) => (
  <ellipse cx="60" cy={y} rx={rx} ry="5" fill="#24303A" opacity=".16" filter={`url(#${u('blur')})`} />
);

/** A chew bone. */
export const GlossyBone = ({ className }: P) => (
  <Svg className={className}>{(u) => (
    <>
      <defs><Lin id={u('g')} from="#FFE9C7" to="#D9893A" x1={30} y1={30} x2={90} y2={95} /></defs>
      <Shadow u={u} />
      <g transform="rotate(-35 60 60)" fill={`url(#${u('g')})`}>
        <rect x="24" y="49" width="72" height="22" rx="11" />
        <circle cx="22" cy="45" r="15" /><circle cx="22" cy="75" r="15" />
        <circle cx="98" cy="45" r="15" /><circle cx="98" cy="75" r="15" />
        <g fill="#fff" opacity=".6">
          <ellipse cx="18" cy="40" rx="6" ry="4" /><ellipse cx="94" cy="40" rx="6" ry="4" />
          <rect x="34" y="52" width="52" height="5" rx="2.5" />
        </g>
      </g>
    </>
  )}</Svg>
);

/** A toy ball with seams. */
export const GlossyBall = ({ className }: P) => (
  <Svg className={className}>{(u) => (
    <>
      <defs>
        <Rad id={u('g')} light="#9FF0DD" mid="#2BB597" dark="#11705E" />
        <clipPath id={u('c')}><circle cx="60" cy="56" r="46" /></clipPath>
      </defs>
      <Shadow u={u} rx={36} />
      <circle cx="60" cy="56" r="46" fill={`url(#${u('g')})`} />
      <g clipPath={`url(#${u('c')})`} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".9">
        <path d="M26 18 C52 40 52 72 26 96" /><path d="M94 18 C68 40 68 72 94 96" />
      </g>
      <ellipse cx="42" cy="34" rx="14" ry="8" fill="#fff" opacity=".45" transform="rotate(-30 42 34)" />
    </>
  )}</Svg>
);

/** A care bottle with a pump, and a sparkle. */
export const GlossyBottle = ({ className }: P) => (
  <Svg className={className}>{(u) => (
    <>
      <defs>
        <Lin id={u('b')} from="#D9CCFF" to="#7C5CFA" x1={30} y1={40} x2={90} y2={110} />
        <Lin id={u('n')} from="#FFFFFF" to="#DCD3FF" x1={48} y1={24} x2={72} y2={44} />
        <Lin id={u('s')} from="#FFE79A" to="#F5A623" x1={90} y1={18} x2={110} y2={44} />
      </defs>
      <Shadow u={u} rx={30} />
      <path d="M76 14h14a5 5 0 010 10H78z" fill="#5B3EDB" />
      <rect x="42" y="10" width="36" height="14" rx="7" fill="#6A4BDF" />
      <rect x="48" y="22" width="24" height="20" rx="5" fill={`url(#${u('n')})`} />
      <rect x="30" y="38" width="60" height="70" rx="20" fill={`url(#${u('b')})`} />
      <rect x="40" y="62" width="40" height="28" rx="9" fill="#fff" opacity=".92" />
      <g fill="#22A38B" transform="translate(48 66) scale(.5)">
        <circle cx="10" cy="14" r="4.4" /><circle cx="18" cy="7" r="4.4" /><circle cx="26" cy="7" r="4.4" /><circle cx="34" cy="14" r="4.4" />
        <path d="M22 17c-6 0-12 7.2-12 12.8 0 3.8 2.8 5.2 6 5.2 2.6 0 4-1.2 6-1.2s3.4 1.2 6 1.2c3.2 0 6-1.4 6-5.2C34 24.2 28 17 22 17z" />
      </g>
      <rect x="36" y="46" width="7" height="52" rx="3.5" fill="#fff" opacity=".45" />
      <path d="M102 20l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill={`url(#${u('s')})`} />
    </>
  )}</Svg>
);

/** A wrapped present with a bow. */
export const GlossyGift = ({ className }: P) => (
  <Svg className={className}>{(u) => (
    <>
      <defs>
        <Lin id={u('b')} from="#FF9DB8" to="#E23F72" x1={20} y1={56} x2={100} y2={110} />
        <Lin id={u('l')} from="#FFC2D3" to="#FF6B93" x1={14} y1={40} x2={106} y2={62} />
        <Lin id={u('r')} from="#FFE79A" to="#F5A623" x1={52} y1={30} x2={68} y2={110} />
      </defs>
      <Shadow u={u} />
      <rect x="18" y="56" width="84" height="52" rx="12" fill={`url(#${u('b')})`} />
      <rect x="12" y="40" width="96" height="24" rx="11" fill={`url(#${u('l')})`} />
      <rect x="52" y="40" width="16" height="68" fill={`url(#${u('r')})`} />
      <ellipse cx="45" cy="30" rx="17" ry="11" transform="rotate(-25 45 30)" fill={`url(#${u('r')})`} />
      <ellipse cx="75" cy="30" rx="17" ry="11" transform="rotate(25 75 30)" fill={`url(#${u('r')})`} />
      <circle cx="60" cy="38" r="8" fill="#F5A623" />
      <rect x="18" y="44" width="30" height="5" rx="2.5" fill="#fff" opacity=".5" />
      <ellipse cx="40" cy="26" rx="6" ry="3" transform="rotate(-25 40 26)" fill="#fff" opacity=".6" />
    </>
  )}</Svg>
);

/** A paw: made to fit your dog. */
export const GlossyPaw = ({ className }: P) => (
  <Svg className={className}>{(u) => (
    <>
      <defs><Rad id={u('g')} light="#FFE9A8" mid="#FFB547" dark="#E07A1F" /></defs>
      <Shadow u={u} rx={34} />
      <g fill={`url(#${u('g')})`}>
        <ellipse cx="26" cy="46" rx="12" ry="15" transform="rotate(-20 26 46)" />
        <ellipse cx="46" cy="26" rx="12" ry="15" transform="rotate(-6 46 26)" />
        <ellipse cx="74" cy="26" rx="12" ry="15" transform="rotate(6 74 26)" />
        <ellipse cx="94" cy="46" rx="12" ry="15" transform="rotate(20 94 46)" />
        <path d="M60 50c-17 0-34 20-34 36 0 11 8 16 17 16 7 0 11-4 17-4s10 4 17 4c9 0 17-5 17-16 0-16-17-36-34-36z" />
      </g>
      <g fill="#fff" opacity=".55">
        <ellipse cx="22" cy="40" rx="4" ry="3" /><ellipse cx="42" cy="19" rx="4" ry="3" /><ellipse cx="70" cy="19" rx="4" ry="3" /><ellipse cx="90" cy="40" rx="4" ry="3" />
        <ellipse cx="46" cy="64" rx="9" ry="5" transform="rotate(-30 46 64)" />
      </g>
    </>
  )}</Svg>
);

/** The Pupbox box, closed, with tape and the paw. */
export const GlossyBox = ({ className }: P) => (
  <Svg className={className}>{(u) => (
    <>
      <defs>
        <Lin id={u('t')} from="#A8F0DF" to="#3CC3A7" x1={20} y1={20} x2={100} y2={60} />
        <Lin id={u('l')} from="#2BB597" to="#167E6A" x1={14} y1={44} x2={60} y2={112} />
        <Lin id={u('r')} from="#5ECDB5" to="#22A38B" x1={60} y1={44} x2={106} y2={112} />
      </defs>
      <Shadow u={u} y={112} />
      <path d="M60 18 L106 40 L60 62 L14 40Z" fill={`url(#${u('t')})`} />
      <path d="M14 40 L60 62 L60 112 L14 90Z" fill={`url(#${u('l')})`} />
      <path d="M60 62 L106 40 L106 90 L60 112Z" fill={`url(#${u('r')})`} />
      <path d="M37 29 L83 51" stroke="#fff" strokeOpacity=".55" strokeWidth="9" />
      <path d="M14 40 L60 62 L106 40" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2" />
      <g fill="#fff" opacity=".92" transform="translate(73 66) scale(.48) skewY(-25)">
        <circle cx="10" cy="14" r="4.4" /><circle cx="18" cy="7" r="4.4" /><circle cx="26" cy="7" r="4.4" /><circle cx="34" cy="14" r="4.4" />
        <path d="M22 17c-6 0-12 7.2-12 12.8 0 3.8 2.8 5.2 6 5.2 2.6 0 4-1.2 6-1.2s3.4 1.2 6 1.2c3.2 0 6-1.4 6-5.2C34 24.2 28 17 22 17z" />
      </g>
    </>
  )}</Svg>
);

/** Build your own: an open lilac box with a bone, a ball and a sparkle popping out. */
export const GlossyBuild = ({ className }: P) => (
  <Svg className={className}>{(u) => (
    <>
      <defs>
        <Lin id={u('l')} from="#9F86FF" to="#5B3EDB" x1={14} y1={54} x2={60} y2={112} />
        <Lin id={u('r')} from="#C3B2FF" to="#7C5CFA" x1={60} y1={54} x2={106} y2={112} />
        <Lin id={u('f')} from="#EDE7FF" to="#B9A6FF" x1={10} y1={18} x2={110} y2={54} />
        <Lin id={u('b')} from="#FFE9C7" to="#D9893A" x1={30} y1={14} x2={60} y2={50} />
        <Rad id={u('p')} light="#FFC2D3" mid="#FF5C8D" dark="#D12E62" />
        <Lin id={u('s')} from="#FFE79A" to="#F5A623" x1={52} y1={2} x2={68} y2={24} />
      </defs>
      <Shadow u={u} y={112} />
      {/* back flaps, opened up */}
      <path d="M14 54 L60 34 L50 16 L6 36Z" fill={`url(#${u('f')})`} />
      <path d="M60 34 L106 54 L114 36 L70 16Z" fill={`url(#${u('f')})`} />
      {/* inside */}
      <path d="M14 54 L60 34 L106 54 L60 76Z" fill="#4A2FC0" />
      {/* what pops out */}
      <g transform="translate(30 30) rotate(-32)" fill={`url(#${u('b')})`}>
        <rect x="4" y="6" width="26" height="8" rx="4" />
        <circle cx="4" cy="6" r="5" /><circle cx="4" cy="14" r="5" /><circle cx="30" cy="6" r="5" /><circle cx="30" cy="14" r="5" />
      </g>
      <circle cx="76" cy="40" r="13" fill={`url(#${u('p')})`} />
      <ellipse cx="71" cy="34" rx="5" ry="3" transform="rotate(-30 71 34)" fill="#fff" opacity=".6" />
      <path d="M58 2l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill={`url(#${u('s')})`} />
      {/* front of the box */}
      <path d="M14 54 L60 76 L60 112 L14 92Z" fill={`url(#${u('l')})`} />
      <path d="M60 76 L106 54 L106 92 L60 112Z" fill={`url(#${u('r')})`} />
      <path d="M14 54 L60 76 L106 54" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.5" strokeLinejoin="round" />
      <g fill="#fff" opacity=".92" transform="translate(73 80) scale(.44) skewY(-25)">
        <circle cx="10" cy="14" r="4.4" /><circle cx="18" cy="7" r="4.4" /><circle cx="26" cy="7" r="4.4" /><circle cx="34" cy="14" r="4.4" />
        <path d="M22 17c-6 0-12 7.2-12 12.8 0 3.8 2.8 5.2 6 5.2 2.6 0 4-1.2 6-1.2s3.4 1.2 6 1.2c3.2 0 6-1.4 6-5.2C34 24.2 28 17 22 17z" />
      </g>
    </>
  )}</Svg>
);

/** A clipboard with ticks: choose a plan. */
export const GlossyPlan = ({ className }: P) => (
  <Svg className={className}>{(u) => (
    <>
      <defs>
        <Lin id={u('b')} from="#CBBBFF" to="#7C5CFA" />
        <Lin id={u('c')} from="#8E73FF" to="#5B3EDB" x1={44} y1={8} x2={76} y2={26} />
      </defs>
      <Shadow u={u} rx={34} />
      <rect x="20" y="16" width="80" height="94" rx="16" fill={`url(#${u('b')})`} />
      <rect x="30" y="28" width="60" height="72" rx="9" fill="#fff" />
      <rect x="42" y="8" width="36" height="18" rx="7" fill={`url(#${u('c')})`} />
      {[44, 62, 80].map((y, k) => (
        <g key={y}>
          <circle cx="44" cy={y} r="6" fill={k < 2 ? '#22A38B' : '#E3E9EC'} />
          {k < 2 && <path d={`M41 ${y}l2.2 2.2L47 ${y - 3}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          <rect x="56" y={y - 3} width={k === 1 ? 20 : 26} height="6" rx="3" fill="#E3E9EC" />
        </g>
      ))}
      <rect x="25" y="22" width="6" height="40" rx="3" fill="#fff" opacity=".35" />
    </>
  )}</Svg>
);

/** A heart: a happy dog. */
export const GlossyHeart = ({ className }: P) => (
  <Svg className={className}>{(u) => (
    <>
      <defs><Rad id={u('g')} light="#FFC2D3" mid="#FF5C8D" dark="#D12E62" /></defs>
      <Shadow u={u} rx={34} />
      <path d="M60 106C24 82 8 62 8 40 8 22 22 10 39 10c10 0 17 5 21 12 4-7 11-12 21-12 17 0 31 12 31 30 0 22-16 42-52 66z" fill={`url(#${u('g')})`} />
      <ellipse cx="34" cy="30" rx="13" ry="8" transform="rotate(-35 34 30)" fill="#fff" opacity=".55" />
    </>
  )}</Svg>
);

/** Admin picks an emoji in Page Builder; the site draws the matching glossy icon. */
export const GLOSSY_FOR_EMOJI: Record<string, (p: P) => JSX.Element> = {
  '🦴': GlossyBone, '🍖': GlossyBone, '🧸': GlossyBall, '🎾': GlossyBall, '⚽': GlossyBall,
  '✨': GlossyBottle, '🧴': GlossyBottle, '🛁': GlossyBottle,
  '🎁': GlossyGift, '🐶': GlossyPaw, '🐕': GlossyPaw, '🐾': GlossyPaw,
  '📦': GlossyBox, '🧩': GlossyBuild, '🛠️': GlossyBuild, '📋': GlossyPlan, '❤️': GlossyHeart, '💚': GlossyHeart,
};
