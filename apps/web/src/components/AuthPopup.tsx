'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AuthModal from '@/components/AuthModal';
import { LoginPage } from '@/app/[lang]/login/LoginForm';
import { RegisterPage } from '@/app/[lang]/register/RegisterForm';
import { usePath } from '@/lib/path';

type Kind = 'login' | 'register';
const AUTH = /^\/(?:ka|en)\/(login|register)\/?$/;

/** Inside the pop-up: switch between sign in and sign up without leaving it. */
const Ctx = createContext<{ switchTo: (k: Kind, href: string) => void } | null>(null);
export const useAuthPopup = () => useContext(Ctx);

/**
 * Sign in / sign up as a pop-up over the current page. A tap on any link to
 * /login or /register opens it here instead of leaving the page; the address
 * still changes (so Back closes it and the link can be shared), and opening
 * that address directly shows the full page. The site's own code does this,
 * not Next's "intercepting routes": those can't carry the /ka or /en part of
 * the address in a production build and fell back to the full page.
 */
export default function AuthPopup() {
  const [kind, setKind] = useState<Kind | null>(null);
  const opened = useRef(false);
  const path = usePath();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      const m = url.origin === location.origin && url.pathname.match(AUTH);
      // Already on the full sign-in or sign-up page: let the link work as usual.
      if (!m || AUTH.test(location.pathname)) return;
      e.preventDefault();
      history.pushState(history.state, '', url.pathname + url.search);
      opened.current = true;
      setKind(m[1] as Kind);
    };
    // Capture: before the link's own handler, which then sees it was handled.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Back (or anything that leaves /login and /register) closes it.
  useEffect(() => {
    if (!kind) return;
    const m = location.pathname.match(AUTH);
    if (!m) { setKind(null); opened.current = false; }
    else if (m[1] !== kind) setKind(m[1] as Kind);
  }, [path, kind]);
  useEffect(() => {
    const onPop = () => { if (!AUTH.test(location.pathname)) { setKind(null); opened.current = false; } };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const switchTo = useCallback((k: Kind, href: string) => { history.replaceState(history.state, '', href); setKind(k); }, []);

  if (!kind) return null;
  return (
    <Ctx.Provider value={{ switchTo }}>
      {kind === 'login'
        ? <AuthModal titleKey="login.heading"><LoginPage inModal /></AuthModal>
        : <AuthModal titleKey="register.heading" size="md"><RegisterPage inModal /></AuthModal>}
    </Ctx.Provider>
  );
}
