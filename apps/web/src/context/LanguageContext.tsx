'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { toGeorgian } from '@/lib/apiMessages';
import { BUILT_IN_STRINGS as FB } from '@pupbox/content';
import { LANG_COOKIE } from '@/lib/lang';
import { usePathname, useRouter } from 'next/navigation';
import { langOf, stripLang, withLang } from '@/lib/path';

type Lang = 'en' | 'ka';


interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Look up a translation by flat key. Falls back to hardcoded value, then the key itself. */
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ka',
  setLang: () => {},
  t: (key) => FB[key]?.ka ?? key,
});

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/** Signed-in customers get emails in the language they use the site in. */
export function saveForEmails(l: Lang) {
  const token = localStorage.getItem('pupbox_token');
  if (!token) return;
  fetch(`${API}/users/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ language: l }) }).catch(() => {});
}

/** The cookie lets server-rendered pages (the shop's A–Z order) follow the visitor's language too. */
function rememberForServer(l: Lang) {
  document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // The language is the one in the address: /ka/... or /en/....
  const pathname = usePathname() || '/';
  const router = useRouter();
  const lang: Lang = langOf(pathname);
  // CMS overrides: key → { en, ka }
  const [cms, setCms] = useState<Record<string, { en: string; ka: string }>>({});


  // Fetch translations from CMS once on mount
  useEffect(() => {
    fetch(`${API}/cms/config-translations`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const strings: { key: string; en: string; ka: string }[] = data?.content?.strings || [];
        if (!strings.length) return;
        const map: Record<string, { en: string; ka: string }> = {};
        for (const s of strings) {
          if (s.key) map[s.key] = { en: s.en || '', ka: s.ka || '' };
        }
        setCms(map);
      })
      .catch(() => {});
  }, []);

  // The API writes its error messages in English. Every error response from
  // it is put into Georgian here, once, before any page shows it — so no
  // form or toast can show an English message to a Georgian visitor.
  const langRef = useRef(lang);
  langRef.current = lang;
  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const res = await original(...args);
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url ?? String(args[0]);
      if (res.ok || langRef.current !== 'ka' || !url.startsWith(API)) return res;
      if (!(res.headers.get('content-type') || '').includes('application/json')) return res;
      try {
        const data = await res.clone().json();
        if (data && (typeof data.message === 'string' || Array.isArray(data.message))) {
          data.message = Array.isArray(data.message) ? data.message.map(toGeorgian) : toGeorgian(data.message);
          return new Response(JSON.stringify(data), { status: res.status, statusText: res.statusText, headers: res.headers });
        }
      } catch {}
      return res;
    };
    return () => { window.fetch = original; };
  }, []);

  // Screen readers and search engines read the page language from <html>.
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  /** Switching language moves to the same page in the other language. */
  function setLang(l: Lang) {
    if (l === lang) return;
    rememberForServer(l);
    saveForEmails(l);
    router.push(`${withLang(stripLang(pathname), l)}${window.location.search}${window.location.hash}`);
  }

  const t = useCallback((key: string, fallback?: string): string => {
    const entry = cms[key] ?? FB[key];
    if (entry) return entry[lang] || entry['en'] || fallback || key;
    return fallback || key;
  }, [lang, cms]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
