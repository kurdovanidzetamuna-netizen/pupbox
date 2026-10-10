'use client';
import { useEffect, useState } from 'react';

const PIECES = ['🐾', '🦴', '🎉', '⭐', '🐶', '💚'];

/**
 * A short burst of paws and bones for happy moments (order paid, sign-up
 * done). Plays once, never blocks clicks, and is hidden for people who ask
 * their device for less motion.
 */
export default function Confetti({ count = 28 }: { count?: number }) {
  const [pieces, setPieces] = useState<{ left: number; drift: number; spin: number; dur: number; delay: number; char: string }[]>([]);
  useEffect(() => {
    setPieces(Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      drift: (Math.random() - 0.5) * 30,
      spin: (Math.random() - 0.5) * 720,
      dur: 2.2 + Math.random() * 1.6,
      delay: Math.random() * 0.6,
      char: PIECES[i % PIECES.length],
    })));
    const id = setTimeout(() => setPieces([]), 4800);
    return () => clearTimeout(id);
  }, [count]);
  return (
    <div aria-hidden="true">
      {pieces.map((p, i) => (
        <span key={i} className="confetti-piece"
          style={{ left: `${p.left}vw`, ['--drift' as any]: `${p.drift}vw`, ['--spin' as any]: `${p.spin}deg`, ['--dur' as any]: `${p.dur}s`, ['--delay' as any]: `${p.delay}s` }}>
          {p.char}
        </span>
      ))}
    </div>
  );
}
