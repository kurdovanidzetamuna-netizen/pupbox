'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { toGeorgian } from '@/lib/apiMessages';
import { PURCHASE_STRINGS } from './strings/purchase';
import { STORE_STRINGS } from './strings/store';
import { ACCOUNT_STRINGS } from './strings/account';
import { LANG_COOKIE } from '@/lib/lang';

type Lang = 'en' | 'ka';

// Hardcoded fallbacks — used before CMS loads or when a key is missing
const FB: Record<string, { en: string; ka: string }> = {
  'nav.signIn':              { en: 'Sign In',                    ka: 'შესვლა' },
  'nav.cart':                { en: 'Cart',                       ka: 'კალათა' },
  'nav.account':             { en: 'My account',                 ka: 'ჩემი ანგარიში' },
  'nav.menu':                { en: 'Menu',                       ka: 'მენიუ' },
  'nav.language':            { en: 'Language',                   ka: 'ენა' },
  'hero.cta3':               { en: 'See How It Works',           ka: 'როგორ მუშაობს' },
  'plans.benefit1.title':    { en: 'Free delivery',              ka: 'უფასო მიწოდება' },
  'plans.benefit1.desc':     { en: 'All subscription boxes include free delivery across Georgia.', ka: 'ყველა გამოწერის კოლოფი მოიცავს უფასო მიწოდებას მთელ საქართველოში.' },
  'plans.benefit2.title':    { en: 'Cancel anytime',             ka: 'გაუქმება ნებისმიერ დროს' },
  'plans.benefit2.desc':     { en: 'No contracts. Cancel your subscription whenever you want.', ka: 'ხელშეკრულება არ არის. გააუქმე გამოწერა ნებისმიერ დროს.' },
  'plans.benefit3.title':    { en: 'Customer support',           ka: 'მომხმარებლის მხარდაჭერა' },
  'plans.benefit3.desc':     { en: 'Our team is here to help with any questions about your order.', ka: 'ჩვენი გუნდი მზადაა დაგეხმარო ნებისმიერ კითხვაში.' },
  'cta.heading':             { en: "Make your dog's month, every month.", ka: 'გაახარე შენი ძაღლი, ყოველ თვე.' },
  'cta.headingAccent':       { en: 'every month.',                        ka: 'ყოველ თვე.' },
  'cta.description':         { en: 'Join hundreds of Georgian dog owners who already trust Pupbox. First box ships in 3–5 days.', ka: 'შეუერთდი ასობით ქართველ ძაღლის პატრონს, ვინც უკვე ენდობა Pupbox-ს. პირველი კოლოფი 3–5 დღეში.' },
  'cta.trustChip1':          { en: '✅ Cancel anytime',                   ka: '✅ გაუქმება ნებისმიერ დროს' },
  'cta.trustChip2':          { en: '🚚 Free delivery',                    ka: '🚚 უფასო მიწოდება' },
  'cta.trustChip3':          { en: '🎁 Personalised boxes',               ka: '🎁 პერსონალიზებული კოლოფები' },
  'cta.btn1':                { en: 'Start Your Subscription →',           ka: 'გამოწერის დაწყება →' },
  'cta.btn2':                { en: 'Compare Plans',                       ka: 'გეგმების შედარება' },
  'blog.cta.heading':        { en: 'Spoil your dog every month',          ka: 'გაახარე შენი ძაღლი ყოველ თვე' },
  'blog.cta.desc':           { en: 'Curated boxes of treats, toys & accessories.', ka: 'კურირებული კოლოფები საჭმლით, სათამაშოებითა და აქსესუარებით.' },
  'blog.cta.btn':            { en: 'Subscribe Now',                       ka: 'გამოწერა' },
  'blog.readMore':           { en: 'Read →',                              ka: 'წაკითხვა →' },
  'blog.categories':         { en: 'Categories',                          ka: 'კატეგორიები' },
  'blog.allPosts':           { en: 'All posts',                           ka: 'ყველა სტატია' },
  'login.heading':           { en: 'Sign in to your account',             ka: 'ანგარიშში შესვლა' },
  'login.email':             { en: 'Email',                               ka: 'ელ-ფოსტა' },
  'login.password':          { en: 'Password',                            ka: 'პაროლი' },
  'login.btn':               { en: 'Sign In',                             ka: 'შესვლა' },
  'login.loading':           { en: 'Signing in...',                       ka: 'შესვლა...' },
  'login.noAccount':         { en: "Don't have an account?",              ka: 'ანგარიში არ გაქვს?' },
  'login.createOne':         { en: 'Create one',                          ka: 'შექმენი' },
  'login.forgot':            { en: 'Forgot password?',                    ka: 'დაგავიწყდა პაროლი?' },
  'login.e.email':           { en: 'Enter a valid email address',         ka: 'შეიყვანე სწორი ელფოსტა' },
  'login.e.password':        { en: 'Enter your password',                 ka: 'შეიყვანე პაროლი' },
  'fp.heading':              { en: 'Forgot your password?',               ka: 'დაგავიწყდა პაროლი?' },
  'fp.sub':                  { en: "Enter your email and we'll send you a link to set a new one.", ka: 'შეიყვანე ელ-ფოსტა და გამოგიგზავნით ბმულს ახალი პაროლის დასაყენებლად.' },
  'fp.btn':                  { en: 'Send link',                           ka: 'ბმულის გაგზავნა' },
  'fp.sending':              { en: 'Sending…',                            ka: 'იგზავნება…' },
  'fp.sent':                 { en: "If an account exists for {email}, a link is on its way. It works for one hour — check spam too.", ka: 'თუ {email}-ზე ანგარიში არსებობს, ბმული უკვე გზაშია. ერთი საათი მოქმედებს — შეამოწმე სპამიც.' },
  'fp.back':                 { en: 'Back to sign in',                     ka: 'შესვლაზე დაბრუნება' },
  'rp.heading':              { en: 'Set a new password',                  ka: 'ახალი პაროლის დაყენება' },
  'rp.password':             { en: 'New password',                        ka: 'ახალი პაროლი' },
  'rp.confirm':              { en: 'Repeat new password',                 ka: 'გაიმეორე ახალი პაროლი' },
  'rp.hint':                 { en: 'At least 8 characters.',              ka: 'მინიმუმ 8 სიმბოლო.' },
  'rp.e.short':              { en: 'Use at least 8 characters.',          ka: 'გამოიყენე მინიმუმ 8 სიმბოლო.' },
  'rp.e.match':              { en: "The passwords don't match.",          ka: 'პაროლები არ ემთხვევა.' },
  'rp.e.link':               { en: 'This link has expired or was already used. Ask for a new one.', ka: 'ბმულს ვადა გაუვიდა ან უკვე გამოყენებულია. მოითხოვე ახალი.' },
  'rp.btn':                  { en: 'Save new password',                   ka: 'ახალი პაროლის შენახვა' },
  'rp.saving':               { en: 'Saving…',                             ka: 'ინახება…' },
  'rp.done':                 { en: "Password changed. You're signed in, and signed out everywhere else.", ka: 'პაროლი შეიცვალა. შესული ხარ, ხოლო სხვა ყველა მოწყობილობიდან გამოსული.' },
  'rp.newLink':              { en: 'Ask for a new link',                  ka: 'ახალი ბმულის მოთხოვნა' },
  'register.heading':        { en: 'Create your account',                 ka: 'ანგარიშის შექმნა' },
  'register.subheading':     { en: 'Join thousands of happy dogs across Georgia 🐾', ka: 'შეუერთდი ათასობით ბედნიერ ძაღლს საქართველოში 🐾' },
  'register.firstName':      { en: 'First name',                          ka: 'სახელი' },
  'register.lastName':       { en: 'Last name',                           ka: 'გვარი' },
  'register.phone':          { en: 'Phone',                    ka: 'ტელეფონი' },
  'register.referral':       { en: 'Referral code',            ka: 'რეფერალური კოდი' },
  'register.btn':            { en: 'Create Account',                      ka: 'ანგარიშის შექმნა' },
  'register.loading':        { en: 'Creating account...',                 ka: 'შექმნა...' },
  'register.haveAccount':    { en: 'Already have an account?',            ka: 'უკვე გაქვს ანგარიში?' },
  'register.signIn':         { en: 'Sign in',                             ka: 'შესვლა' },
  'global.backToHome':       { en: 'Back to homepage',                    ka: 'მთავარ გვერდზე დაბრუნება' },
  'global.loading':          { en: 'Loading…',                            ka: 'იტვირთება…' },
  'global.perMonth':         { en: '/month',                              ka: '/თვეში' },
  'global.savePercent':      { en: 'Save',                                ka: 'დაზოგე' },
  'global.vsMonthly':        { en: 'vs monthly',                          ka: 'ყოველთვიურთან შედარებით' },
  'global.freeDelivery':     { en: 'Free delivery',                       ka: 'უფასო მიწოდება' },
  'global.cancelAnytime':    { en: 'Cancel anytime',                      ka: 'გაუქმება ნებისმიერ დროს' },
};

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
  const [lang, setLangState] = useState<Lang>('ka');
  // CMS overrides: key → { en, ka }
  const [cms, setCms] = useState<Record<string, { en: string; ka: string }>>({});

  // Georgian is the site's language: every page load starts in Georgian.
  // English is a switch for the current visit only, so a refresh or a new
  // visit never lands someone in English by surprise. (An older saved choice
  // is cleared.)
  useEffect(() => {
    try { localStorage.removeItem('pupbox_lang'); } catch {}
    rememberForServer('ka');
  }, []);

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

  function setLang(l: Lang) {
    setLangState(l);
    rememberForServer(l);
    saveForEmails(l);
  }

  const t = useCallback((key: string, fallback?: string): string => {
    const entry = cms[key] ?? FB[key] ?? PURCHASE_STRINGS[key] ?? STORE_STRINGS[key] ?? ACCOUNT_STRINGS[key];
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
