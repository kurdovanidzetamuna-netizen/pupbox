'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * A dog's photo on its card: a smaller rounded tile with a white edge in the
 * middle, so the card's soft colour shows around it like the emoji cards.
 * Fades in once loaded; on hover (of a `group` parent) it grows a touch and tilts.
 */
export default function DogPhoto({ src, alt, size = 'w-[64%]' }: { src: string; alt: string; size?: string }) {
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // An image already in the cache may finish before React is listening.
  useEffect(() => { if (img.current?.complete) setLoaded(true); }, []);
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <span className={`relative ${size} aspect-square rounded-[30%] overflow-hidden bg-white/70 ring-[5px] ring-white transition-all duration-500 ease-out group-hover:scale-[1.06] group-hover:-rotate-3 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={img} src={src} alt={alt} onLoad={() => setLoaded(true)} className="w-full h-full object-cover" />
      </span>
    </span>
  );
}
