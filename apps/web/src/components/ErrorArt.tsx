/**
 * Little puppy scenes for the pages nobody wants to see, drawn in the
 * site's mint: lost (a wrong link), broken (something crashed) and asleep
 * (no internet). Plain SVG, so it works even when the rest of the page
 * couldn't load; it gently bobs unless the visitor asks for less motion.
 */
export type Scene = 'lost' | 'broken' | 'offline';

const LINE = '#0F766E';
const INK = '#1F2937';

function Head({ eyes }: { eyes: 'open' | 'closed' | 'worried' }) {
  return (
    <g>
      {/* Floppy ears */}
      <path d="M72 80 C42 70 34 124 54 142 C66 153 82 130 77 104 Z" fill="#A7EBDD" stroke={LINE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M168 80 C198 70 206 124 186 142 C174 153 158 130 163 104 Z" fill="#A7EBDD" stroke={LINE} strokeWidth="3" strokeLinejoin="round" />
      {/* Head, a patch over one eye, cheeks and muzzle */}
      <ellipse cx="120" cy="112" rx="58" ry="54" fill="#FFFFFF" stroke={LINE} strokeWidth="3" />
      <ellipse cx="141" cy="98" rx="17" ry="15" fill="#CCF2EA" />
      <ellipse cx="88" cy="128" rx="9" ry="6" fill="#FFD6C2" opacity=".8" />
      <ellipse cx="152" cy="128" rx="9" ry="6" fill="#FFD6C2" opacity=".8" />
      <ellipse cx="120" cy="134" rx="28" ry="20" fill="#F0FBF8" />
      {/* Eyes */}
      {eyes === 'closed' ? (
        <>
          <path d="M91 102 Q99 109 107 102" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M133 102 Q141 109 149 102" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="99" cy="101" r="7" fill={INK} /><circle cx="101.5" cy="98.5" r="2.3" fill="#fff" />
          <circle cx="141" cy="101" r="7" fill={INK} /><circle cx="143.5" cy="98.5" r="2.3" fill="#fff" />
          {eyes === 'worried' && <>
            <path d="M90 88 L106 92" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <path d="M150 88 L134 92" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          </>}
        </>
      )}
      {/* Nose and mouth */}
      <ellipse cx="120" cy="123" rx="10" ry="7" fill={INK} />
      <path d="M120 130 Q119 139 110 141 M120 130 Q121 139 130 141" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function Paw({ x, y, r = 0, o = 1 }: { x: number; y: number; r?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`} fill="#99E6D6" opacity={o}>
      <ellipse cx="0" cy="4" rx="6" ry="5" />
      <circle cx="-6" cy="-4" r="2.6" /><circle cx="-2" cy="-7.5" r="2.6" /><circle cx="2.5" cy="-7.5" r="2.6" /><circle cx="6.5" cy="-4" r="2.6" />
    </g>
  );
}

export default function ErrorArt({ scene, className = 'w-56 h-48' }: { scene: Scene; className?: string }) {
  return (
    <svg viewBox="0 0 240 200" className={`${className} motion-safe:animate-[bob_3.2s_ease-in-out_infinite]`} role="img" aria-hidden="true">
      {/* Soft ground shadow */}
      <ellipse cx="120" cy="186" rx="64" ry="7" fill="#E6F4F1" />

      {scene === 'lost' && (
        <>
          <Paw x={26} y={176} r={-20} o={0.5} /><Paw x={44} y={160} r={-10} o={0.7} /><Paw x={30} y={140} r={-25} />
          <g transform="rotate(-9 120 112)">
            <Head eyes="open" />
            <path d="M113 141 Q120 156 127 141 Z" fill="#FF8FAB" />
          </g>
          <circle cx="194" cy="44" r="21" fill="#F0FBF8" stroke={LINE} strokeWidth="3" />
          <path d="M184 64 L178 74 L192 65" fill="#F0FBF8" stroke={LINE} strokeWidth="3" strokeLinejoin="round" />
          <text x="194" y="53" textAnchor="middle" fontSize="26" fontWeight="800" fill={LINE} fontFamily="system-ui, sans-serif">?</text>
        </>
      )}

      {scene === 'broken' && (
        <>
          <Head eyes="worried" />
          {/* A plaster on the head */}
          <g transform="rotate(-22 96 70)"><rect x="80" y="64" width="34" height="12" rx="6" fill="#FFE2CC" stroke="#F4B183" strokeWidth="2" /><circle cx="92" cy="70" r="1.4" fill="#F4B183" /><circle cx="102" cy="70" r="1.4" fill="#F4B183" /></g>
          {/* The chewed cable, from the floor to the mouth */}
          <path d="M14 182 C52 178 64 160 102 146" fill="none" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
          <path d="M138 146 C168 158 196 170 228 176" fill="none" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
          <path d="M100 140 l6 -4 l2 7 l5 -5 l3 7" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Spark */}
          <path d="M150 140 l5 -11 l3 9 l9 -4 l-6 9 l9 3 l-10 2 l2 10 l-7 -8 l-6 6 l2 -10 z" fill="#FFC27A" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
        </>
      )}

      {scene === 'offline' && (
        <>
          <Head eyes="closed" />
          {/* Zzz */}
          <text x="176" y="58" fontSize="22" fontWeight="800" fill={LINE} fontFamily="system-ui, sans-serif">z</text>
          <text x="194" y="40" fontSize="17" fontWeight="800" fill="#2DB89C" fontFamily="system-ui, sans-serif">z</text>
          <text x="207" y="26" fontSize="12" fontWeight="800" fill="#7FD9C6" fontFamily="system-ui, sans-serif">z</text>
          {/* A little cloud with no signal */}
          <path d="M26 64 a12 12 0 0 1 20 -10 a15 15 0 0 1 27 6 a10 10 0 0 1 -2 20 h-41 a9 9 0 0 1 -4 -16 z" fill="#F0FBF8" stroke={LINE} strokeWidth="2.5" />
          <path d="M40 66 q12 -9 24 0 M45 71 q7 -5 14 0" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="52" cy="75" r="2" fill="#94A3B8" />
          <path d="M36 58 L70 82" stroke="#F87171" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
