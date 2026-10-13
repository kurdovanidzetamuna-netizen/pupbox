/**
 * Friendly 3D-style illustrations (Airbnb-like): solid shapes with a light
 * face, a darker side and a soft highlight. Brand teal with warm pink and
 * violet. Decorative: hidden from screen readers.
 */

const C = {
  teal: '#16B492', tealDark: '#0E9579', tealDeep: '#0A7A63',
  pink: '#FF5C8D', pinkDark: '#E8457A',
  violet: '#7C5CFA', violetDark: '#5B3EDB',
  line: '#E6ECEA',
};

type P = { className?: string };
const Svg = ({ className, children }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 120 120" className={className} aria-hidden="true">{children}</svg>
);
const Shadow = ({ y = 106, rx = 38 }: { y?: number; rx?: number }) => <ellipse cx="60" cy={y} rx={rx} ry="6" fill="#000" opacity=".08" />;
const PawMark = ({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) => (
  <g fill={fill} transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx="5" cy="8" r="2.6" /><circle cx="10" cy="4" r="2.6" /><circle cx="16" cy="4" r="2.6" /><circle cx="21" cy="8" r="2.6" />
    <path d="M13 9.5c-3.4 0-7 4-7 7.4 0 2.2 1.6 3 3.4 3 1.5 0 2.3-.7 3.6-.7s2.1.7 3.6.7c1.8 0 3.4-.8 3.4-3 0-3.4-3.6-7.4-7-7.4z" />
  </g>
);

/** The Pupbox box, open, with a bone peeking out. */
export const BoxIcon = ({ className }: P) => (
  <Svg className={className}>
    <Shadow />
    <path d="M20 50 L60 36 L100 50 L60 64Z" fill={C.tealDeep} />
    <g transform="rotate(-18 60 40)">
      <rect x="44" y="31" width="32" height="10" rx="5" fill="#fff" />
      <circle cx="44" cy="32" r="6" fill="#fff" /><circle cx="44" cy="40" r="6" fill="#fff" />
      <circle cx="76" cy="32" r="6" fill="#fff" /><circle cx="76" cy="40" r="6" fill="#fff" />
    </g>
    <circle cx="80" cy="40" r="7" fill={C.pink} />
    <path d="M20 50 L60 64 L60 106 L20 92Z" fill={C.tealDark} />
    <path d="M60 64 L100 50 L100 92 L60 106Z" fill={C.teal} />
    <path d="M20 50 L8 39 L48 25 L60 36Z" fill={C.teal} />
    <path d="M100 50 L112 39 L72 25 L60 36Z" fill={C.tealDark} />
    <path d="M66 70 L94 60 L94 66 L66 76Z" fill="#fff" opacity=".3" />
    <circle cx="40" cy="82" r="8" fill="#fff" />
    <PawMark x={34.5} y={76.5} s={0.45} fill={C.tealDark} />
  </Svg>
);

/** A bowl of treats with a sparkle: build your own box. */
export const BuildIcon = ({ className }: P) => (
  <Svg className={className}>
    <Shadow rx={40} />
    <ellipse cx="60" cy="62" rx="42" ry="12" fill={C.violetDark} />
    <circle cx="46" cy="58" r="8" fill={C.pink} /><circle cx="62" cy="54" r="8" fill="#fff" /><circle cx="76" cy="60" r="7" fill={C.teal} />
    <path d="M18 62 Q22 100 60 102 Q98 100 102 62 Q98 74 60 74 Q22 74 18 62Z" fill={C.violet} />
    <path d="M30 80 Q44 90 60 90" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".35" />
    <path d="M92 22 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill={C.pink} />
    <path d="M20 30 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" fill={C.teal} />
  </Svg>
);

/** A gift box with a white ribbon. */
export const GiftIcon = ({ className }: P) => (
  <Svg className={className}>
    <Shadow />
    <rect x="24" y="54" width="72" height="48" rx="8" fill={C.pink} />
    <rect x="18" y="40" width="84" height="18" rx="7" fill={C.pinkDark} />
    <rect x="54" y="40" width="12" height="62" fill="#fff" />
    <path d="M60 40 C46 20 26 26 36 38 C40 42 52 41 60 40Z" fill="#fff" />
    <path d="M60 40 C74 20 94 26 84 38 C80 42 68 41 60 40Z" fill="#fff" />
    <rect x="30" y="62" width="18" height="6" rx="3" fill="#fff" opacity=".3" />
  </Svg>
);

/** A shopping bag with a paw: the shop. */
export const BagIcon = ({ className }: P) => (
  <Svg className={className}>
    <Shadow rx={36} />
    <path d="M42 44 C42 22 78 22 78 44" stroke={C.violetDark} strokeWidth="7" fill="none" strokeLinecap="round" />
    <path d="M26 42 H94 L100 100 Q100 104 96 104 H24 Q20 104 20 100Z" fill={C.violet} />
    <path d="M26 42 H94 L95 52 H25Z" fill={C.violetDark} />
    <PawMark x={47} y={62} s={1.05} fill="#fff" />
  </Svg>
);

/** A clipboard with two ticks: choose a plan. */
export const PlanIcon = ({ className }: P) => (
  <Svg className={className}>
    <Shadow y={108} rx={30} />
    <rect x="28" y="20" width="64" height="84" rx="10" fill="#fff" stroke={C.line} strokeWidth="2" />
    <rect x="44" y="12" width="32" height="16" rx="6" fill={C.violet} />
    <path d="M40 50l6 6 10-12" stroke={C.teal} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="62" y="46" width="20" height="6" rx="3" fill={C.line} />
    <path d="M40 76l6 6 10-12" stroke={C.teal} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="62" y="72" width="20" height="6" rx="3" fill={C.line} />
  </Svg>
);

/** A happy dog's face. */
export const DogIcon = ({ className }: P) => (
  <Svg className={className}>
    <Shadow y={108} rx={30} />
    <path d="M28 36 C14 40 10 64 18 74 C24 80 32 74 34 66Z" fill="#8A5A3B" />
    <path d="M92 36 C106 40 110 64 102 74 C96 80 88 74 86 66Z" fill="#8A5A3B" />
    <ellipse cx="60" cy="62" rx="36" ry="38" fill="#F2DCC6" />
    <ellipse cx="60" cy="80" rx="20" ry="16" fill="#FFF4EA" />
    <circle cx="46" cy="56" r="5" fill="#2B1B12" /><circle cx="74" cy="56" r="5" fill="#2B1B12" />
    <circle cx="47.6" cy="54.4" r="1.6" fill="#fff" /><circle cx="75.6" cy="54.4" r="1.6" fill="#fff" />
    <ellipse cx="60" cy="72" rx="8" ry="6" fill="#2B1B12" />
    <path d="M60 78 v6 M60 84 c-4 6 -10 4 -12 0 M60 84 c4 6 10 4 12 0" stroke="#2B1B12" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <path d="M55 88 q5 10 10 0" fill={C.pink} />
    <ellipse cx="38" cy="70" rx="6" ry="4" fill={C.pink} opacity=".35" /><ellipse cx="82" cy="70" rx="6" ry="4" fill={C.pink} opacity=".35" />
  </Svg>
);

/** A heart with a paw: a happy dog. */
export const HeartIcon = ({ className }: P) => (
  <Svg className={className}>
    <Shadow y={108} rx={30} />
    <path d="M60 100 C20 74 12 52 22 36 C32 20 52 22 60 38 C68 22 88 20 98 36 C108 52 100 74 60 100Z" fill={C.pink} />
    <ellipse cx="38" cy="44" rx="9" ry="6" fill="#fff" opacity=".4" transform="rotate(-30 38 44)" />
    <PawMark x={46} y={52} s={1.1} fill="#fff" />
  </Svg>
);

/** A white bone: treats. */
export const BoneIcon = ({ className }: P) => (
  <Svg className={className}>
    <Shadow y={100} rx={34} />
    <g transform="rotate(-24 60 60)">
      <rect x="34" y="52" width="52" height="18" rx="9" fill="#fff" />
      <circle cx="34" cy="52" r="11" fill="#fff" /><circle cx="34" cy="70" r="11" fill="#fff" />
      <circle cx="86" cy="52" r="11" fill="#fff" /><circle cx="86" cy="70" r="11" fill="#fff" />
      <rect x="42" y="56" width="30" height="4" rx="2" fill={C.line} />
    </g>
  </Svg>
);

/** A toy ball. */
export const BallIcon = ({ className }: P) => (
  <Svg className={className}>
    <Shadow y={102} rx={30} />
    <circle cx="60" cy="58" r="36" fill={C.pink} />
    <path d="M28 46 C48 56 72 56 92 46 M28 70 C48 60 72 60 92 70" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
    <ellipse cx="46" cy="38" rx="9" ry="6" fill="#fff" opacity=".4" transform="rotate(-30 46 38)" />
  </Svg>
);

/** A care bottle with bubbles. */
export const CareIcon = ({ className }: P) => (
  <Svg className={className}>
    <Shadow y={104} rx={30} />
    <rect x="40" y="34" width="40" height="68" rx="14" fill={C.teal} />
    <rect x="50" y="18" width="20" height="18" rx="5" fill={C.tealDeep} />
    <rect x="48" y="56" width="24" height="22" rx="6" fill="#fff" />
    <circle cx="60" cy="67" r="5" fill={C.teal} />
    <rect x="46" y="40" width="8" height="40" rx="4" fill="#fff" opacity=".3" />
    <circle cx="90" cy="38" r="6" fill="#fff" stroke={C.teal} strokeWidth="2" /><circle cx="98" cy="54" r="4" fill="#fff" stroke={C.teal} strokeWidth="2" />
  </Svg>
);

/** The illustration for an emoji picked in admin (What's in the box), if there is one. */
export const ICON_FOR_EMOJI: Record<string, (p: P) => JSX.Element> = {
  '🦴': BoneIcon, '🍖': BoneIcon, '🧸': BallIcon, '🎾': BallIcon, '✨': CareIcon, '🧴': CareIcon, '🛁': CareIcon,
  '🎁': GiftIcon, '🐶': DogIcon, '🐕': DogIcon, '🐾': DogIcon, '📦': BoxIcon, '❤️': HeartIcon, '💚': HeartIcon,
};
