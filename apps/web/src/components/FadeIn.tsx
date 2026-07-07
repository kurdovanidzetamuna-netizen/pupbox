'use client';
import { useEffect, useRef, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number; // ms
  direction?: 'up' | 'left' | 'right' | 'none';
}

export default function FadeIn({ children, className = '', delay = 0, direction = 'up' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add('fade-in-visible'), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const translateClass =
    direction === 'up' ? 'fade-in-up' :
    direction === 'left' ? 'fade-in-left' :
    direction === 'right' ? 'fade-in-right' : 'fade-in-none';

  return (
    <div ref={ref} className={`fade-in-base ${translateClass} ${className}`}>
      {children}
    </div>
  );
}
