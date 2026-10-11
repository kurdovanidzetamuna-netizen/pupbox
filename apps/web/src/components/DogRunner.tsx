'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const BEST_KEY = 'pupbox_runner_best';
const H = 170;
const GROUND = H - 28;
const DOG = 34;
const OBSTACLES = ['🐈', '🧯', '🌵'];

type Thing = { x: number; y: number; kind: 'block' | 'bone'; char: string; size: number };

function readBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

/**
 * "Pupbox Run": a tiny endless runner. Tap, click or press Space/↑ to jump
 * over cats and hydrants; catch bones for +5. It speeds up as you go and
 * remembers the best score on this device. Nothing runs until it's started.
 */
export default function DogRunner({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'idle' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const game = useRef({ y: GROUND, vy: 0, things: [] as Thing[], speed: 5, dist: 0, score: 0, frame: 0, nextIn: 60 });
  const raf = useRef<number>();

  useEffect(() => { setBest(readBest()); }, []);

  const jump = useCallback(() => {
    const g = game.current;
    if (g.y >= GROUND - 0.5) g.vy = -11.5;
  }, []);

  const start = useCallback(() => {
    game.current = { y: GROUND, vy: 0, things: [], speed: 5, dist: 0, score: 0, frame: 0, nextIn: 50 };
    setScore(0);
    setState('playing');
  }, []);

  const press = useCallback(() => {
    if (state === 'playing') jump();
    else start();
  }, [state, jump, start]);

  // Space / ↑ only while the game is on screen and the focus is on it.
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); press(); }
  };

  useEffect(() => {
    if (state !== 'playing') return;
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const W = wrap.current?.clientWidth || 600;
    c.width = W * dpr; c.height = H * dpr; c.style.width = `${W}px`; c.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    const tick = () => {
      const g = game.current;
      g.frame++;
      g.speed = 5 + Math.min(7, g.dist / 1500);
      g.dist += g.speed;
      g.vy += 0.62;
      g.y = Math.min(GROUND, g.y + g.vy);
      if (g.y === GROUND) g.vy = 0;

      // New obstacle or bone every so often, a bit sooner as it speeds up.
      if (--g.nextIn <= 0) {
        const bone = Math.random() < 0.3;
        g.things.push(bone
          ? { x: W + 20, y: GROUND - 50 - Math.random() * 30, kind: 'bone', char: '🦴', size: 24 }
          : { x: W + 20, y: GROUND, kind: 'block', char: OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)], size: 30 });
        g.nextIn = Math.max(38, 90 - g.speed * 4) + Math.random() * 50;
      }

      let over = false;
      g.things = g.things.filter((th) => {
        th.x -= g.speed;
        const hit = Math.abs(th.x - 50) < (th.size + DOG) / 2 - 10 && Math.abs((th.y - th.size / 2) - (g.y - DOG / 2)) < (th.size + DOG) / 2 - 10;
        if (hit && th.kind === 'bone') { g.score += 5; return false; }
        if (hit) over = true;
        return th.x > -40;
      });
      if (g.frame % 6 === 0) g.score += 1;

      // Draw: sky, ground line with dashes, things, the dog (bobbing while running).
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#F0FBF8'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#BBEDE0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND + 2); ctx.lineTo(W, GROUND + 2); ctx.stroke();
      ctx.fillStyle = '#8FE0CC';
      for (let x = -(g.dist % 40); x < W; x += 40) ctx.fillRect(x, GROUND + 10, 14, 2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      for (const th of g.things) { ctx.font = `${th.size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji"`; ctx.fillText(th.char, th.x, th.y); }
      const bob = g.y === GROUND ? Math.sin(g.frame / 3) * 2 : 0;
      ctx.save(); ctx.translate(50, g.y + bob); ctx.scale(-1, 1);
      ctx.font = `${DOG}px system-ui, "Apple Color Emoji", "Segoe UI Emoji"`; ctx.fillText('🐕', 0, 0);
      ctx.restore();

      setScore(g.score);
      if (over) {
        const b = Math.max(readBest(), g.score);
        try { localStorage.setItem(BEST_KEY, String(b)); } catch {}
        setBest(b);
        setState('over');
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [state]);

  return (
    <div ref={wrap} className="relative w-full select-none">
      <div role="button" tabIndex={0} onClick={press} onKeyDown={onKey} aria-label={t('game.aria')}
        className={`relative w-full overflow-hidden rounded-3xl bg-teal-50 ring-1 ring-teal-100 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-200`}
        style={{ height: H }}>
        <canvas ref={canvas} className={state === 'playing' || state === 'over' ? 'block' : 'hidden'} />
        <div className="absolute top-3 right-4 text-xs font-bold text-teal-800 tabular-nums">
          {t('game.score')} {score} · {t('game.best')} {best}
        </div>
        {state !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-teal-50/80">
            <div className="text-4xl mb-2 animate-bounce" aria-hidden="true">{state === 'over' ? '🐶💫' : '🐕'}</div>
            <p className="font-bold text-gray-800">{state === 'over' ? (score >= best && score > 0 ? t('game.record') : t('game.over')) : t('game.title')}</p>
            {!compact && <p className="text-xs text-gray-500 mt-1">{t('game.how')}</p>}
            <span className="mt-3 inline-flex items-center bg-teal-600 text-white text-sm font-bold px-5 py-2 rounded-full">
              {state === 'over' ? t('game.again') : t('game.start')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
