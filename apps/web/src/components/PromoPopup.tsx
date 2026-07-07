'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

interface Popup {
  id: string;
  active: boolean;
  type: string;
  titleEn: string;
  titleKa: string;
  bodyEn: string;
  bodyKa: string;
  ctaTextEn: string;
  ctaTextKa: string;
  ctaUrl: string;
  couponCode: string;
  imageUrl: string;
  trigger: string;
  delaySeconds: number;
  showOnPages: string[];
  showOncePerSession: boolean;
  showOncePerDay: boolean;
  bgColor: string;
  accentColor: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const DISMISSED_KEY = 'pupbox_dismissed_popups';
const SHOWN_TODAY_KEY = 'pupbox_popups_shown_today';

function getDismissed(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]')); } catch { return new Set(); }
}

function getShownToday(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_TODAY_KEY);
    if (!raw) return new Set();
    const { date, ids } = JSON.parse(raw);
    if (date !== new Date().toDateString()) return new Set();
    return new Set(ids);
  } catch { return new Set(); }
}

function markShownToday(id: string) {
  const existing = getShownToday();
  existing.add(id);
  localStorage.setItem(SHOWN_TODAY_KEY, JSON.stringify({ date: new Date().toDateString(), ids: [...existing] }));
}

function markDismissed(id: string) {
  const existing = getDismissed();
  existing.add(id);
  sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...existing]));
}

function pageName(pathname: string): string {
  if (pathname === '/') return 'homepage';
  if (pathname.startsWith('/prices') || pathname.startsWith('/subscribe')) return 'prices';
  if (pathname.startsWith('/how-it-works')) return 'how-it-works';
  if (pathname.startsWith('/blog')) return 'blog';
  if (pathname.startsWith('/checkout')) return 'checkout';
  return pathname.slice(1);
}

function matchesPage(popup: Popup, pathname: string): boolean {
  const pages = popup.showOnPages || ['all'];
  if (pages.includes('all')) return true;
  return pages.includes(pageName(pathname));
}

export default function PromoPopup() {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();
  const { lang } = useLanguage();

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setPopup(null), 300);
    if (popup) markDismissed(popup.id);
  }, [popup]);

  useEffect(() => {
    // Exit intent
    function onMouseOut(e: MouseEvent) {
      if (e.clientY <= 0 && popup && popup.trigger === 'exit_intent') setVisible(true);
    }
    document.addEventListener('mouseleave', onMouseOut);
    return () => document.removeEventListener('mouseleave', onMouseOut);
  }, [popup]);

  useEffect(() => {
    async function fetchAndSchedule() {
      try {
        const res = await fetch(`${API}/cms/config-promo-popups`);
        if (!res.ok) return;
        const data = await res.json();
        const all: Popup[] = data?.content?.popups || [];
        const dismissed = getDismissed();
        const shownToday = getShownToday();

        const candidate = all.find(p => {
          if (!p.active) return false;
          if (!matchesPage(p, pathname)) return false;
          if (p.showOncePerSession && dismissed.has(p.id)) return false;
          if (p.showOncePerDay && shownToday.has(p.id)) return false;
          return true;
        });

        if (!candidate) return;
        setPopup(candidate);
        markShownToday(candidate.id);

        if (candidate.trigger === 'on_load') {
          setTimeout(() => setVisible(true), 200);
        } else if (candidate.trigger === 'after_delay') {
          setTimeout(() => setVisible(true), (candidate.delaySeconds || 5) * 1000);
        } else if (candidate.trigger === 'on_scroll') {
          const handler = () => {
            const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
            if (pct >= 50) { setVisible(true); window.removeEventListener('scroll', handler); }
          };
          window.addEventListener('scroll', handler, { passive: true });
          return () => window.removeEventListener('scroll', handler);
        }
        // exit_intent handled separately above
      } catch { }
    }
    fetchAndSchedule();
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dismiss]);

  if (!popup) return null;

  const title = lang === 'ka' ? (popup.titleKa || popup.titleEn) : popup.titleEn;
  const body  = lang === 'ka' ? (popup.bodyKa  || popup.bodyEn)  : popup.bodyEn;
  const cta   = lang === 'ka' ? (popup.ctaTextKa || popup.ctaTextEn) : popup.ctaTextEn;

  function copyCoupon() {
    if (!popup?.couponCode) return;
    navigator.clipboard.writeText(popup.couponCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }}
      />

      {/* Card */}
      <div
        style={{
          position: 'relative',
          background: popup.bgColor || '#fff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 420,
          margin: '0 16px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.2)',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(16px)',
          transition: 'transform 0.3s ease',
          overflow: 'hidden',
        }}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#64748b', zIndex: 2 }}
        >×</button>

        {/* Image */}
        {popup.imageUrl && (
          <img src={popup.imageUrl} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
        )}

        <div style={{ padding: popup.imageUrl ? '20px 24px 24px' : '36px 24px 24px', textAlign: 'center' }}>
          {/* Type emoji */}
          {!popup.imageUrl && (
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {popup.type === 'discount' ? '🏷️' : popup.type === 'newsletter' ? '📧' : popup.type === 'exit' ? '🚪' : '📣'}
            </div>
          )}

          {/* Title */}
          {title && (
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>
              {title}
            </h2>
          )}

          {/* Body */}
          {body && (
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
              {body}
            </p>
          )}

          {/* Coupon code */}
          {popup.couponCode && (
            <button
              onClick={copyCoupon}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef9c3', border: '2px dashed #fbbf24', borderRadius: 10, padding: '10px 20px', marginBottom: 16, cursor: 'pointer', transition: 'background 0.15s' }}
            >
              <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.12em', color: '#92400e' }}>{popup.couponCode}</span>
              <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>{copied ? '✓ Copied!' : 'Click to copy'}</span>
            </button>
          )}

          {/* CTA */}
          {cta && popup.ctaUrl && (
            <Link
              href={popup.ctaUrl}
              onClick={dismiss}
              style={{ display: 'block', background: popup.accentColor || '#0d9488', color: '#fff', borderRadius: 12, padding: '13px 24px', fontWeight: 700, fontSize: 15, textDecoration: 'none', transition: 'opacity 0.15s' }}
            >
              {cta}
            </Link>
          )}

          {/* Dismiss link */}
          <button
            onClick={dismiss}
            style={{ marginTop: 14, background: 'none', border: 'none', fontSize: 12, color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
