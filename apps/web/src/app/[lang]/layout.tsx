import RefCapture from '@/components/RefCapture';
import OfflineGame from '@/components/OfflineGame';
import type { Metadata, Viewport } from 'next';
import { SITE_URL, T, asLang, seo } from '@/lib/seo';
import { notFound } from 'next/navigation';
import AuthPopup from '@/components/AuthPopup';
import Tracking from '@/components/Tracking';
import { getMarketing } from '@/lib/marketing';
import { asksAboutCookies } from '@/lib/tracking';
import '../globals.css';
import { Noto_Sans_Georgian } from 'next/font/google';

// Georgian-first type: renders every Georgian letter properly, clean Latin too.
const sans = Noto_Sans_Georgian({ subsets: ['georgian', 'latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-sans', display: 'swap' });
import { CartProvider } from '@/context/CartContext';
import { LanguageProvider } from '@/context/LanguageContext';
import Header from '@/components/Header';
import PromoPopup from '@/components/PromoPopup';
import ScrollReveal from '@/components/ScrollReveal';
import Footer from '@/components/Footer';
import { sitePage } from '@pupbox/content';
import { getStoredContent } from '@/lib/content';
import { API_URL } from '@/lib/api';


/**
 * Defaults for every page, in the page's language; each page sets its own
 * title, description, address and share picture on top (lib/seo.ts).
 */
type Props = { children: React.ReactNode; params: { lang: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = asLang(params.lang);
  const title = T(lang, 'Pupbox — ყოველთვიური ყუთის გამოწერა საქართველოში', 'Pupbox — Monthly dog subscription boxes in Georgia');
  const description = T(lang,
    'პრემიუმ საჭმლის, სათამაშოებისა და აქსესუარების კურირებული ყოველთვიური კოლოფი შენი ძაღლისთვის. მიწოდება მთელ საქართველოში.',
    'Curated monthly boxes of premium treats, toys and accessories for your dog. Delivered across Georgia.');
  const mk = await getMarketing();
  const v = mk?.verification;
  // Admin → SEO & tracking: "hide from search" for test periods.
  const hidden = mk?.seo.hideFromSearch === true;
  return {
    metadataBase: new URL(SITE_URL),
    ...seo({ lang, path: '/', title, description, absoluteTitle: true }),
    title: { default: title, template: '%s | Pupbox' },
    applicationName: 'Pupbox',
    keywords: ['dog subscription box', 'dog treats Georgia', 'pupbox', 'monthly dog box', 'pet subscription', 'ძაღლის გამოწერა', 'ძაღლის საჭმელი', 'pupbox საქართველო'],
    robots: hidden
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    // Ownership checks pasted in admin (Google Search Console, Bing, Meta Business, Yandex).
    ...(v && (v.google || v.bing || v.meta || v.yandex) ? { verification: {
      ...(v.google ? { google: v.google } : {}),
      ...(v.yandex ? { yandex: v.yandex } : {}),
      other: { ...(v.bing ? { 'msvalidate.01': v.bing } : {}), ...(v.meta ? { 'facebook-domain-verification': v.meta } : {}) },
    } } : {}),
    formatDetection: { telephone: false, email: false, address: false },
    appleWebApp: { title: 'Pupbox', capable: true, statusBarStyle: 'default' },
  };
}

/** Phone browsers and in-app browsers (Instagram, Messenger…): proper width, brand colour in the bar. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#178573',
};

export const generateStaticParams = () => [{ lang: 'ka' }, { lang: 'en' }];

/**
 * A refresh opens the page at the top, as if new; browsers otherwise put you
 * back where you had scrolled. Back/forward between the site's pages still
 * return to where you were. Runs before anything paints. The browser reads
 * the setting from the page being left, so it's switched off on the way out
 * (pagehide) and back on once the new page has loaded, since pages opened
 * from it inherit the setting.
 */
const REFRESH_TO_TOP = `(function(){try{
var h=history;
addEventListener('pagehide',function(){h.scrollRestoration='manual'});
addEventListener('pageshow',function(e){if(e.persisted)h.scrollRestoration='auto'});
var n=performance.getEntriesByType('navigation')[0];
if(n&&n.type==='reload'&&!location.hash)scrollTo(0,0);
addEventListener('load',function(){setTimeout(function(){h.scrollRestoration='auto'},0)});
}catch(e){}})();`;

/**
 * Signed in or not is only known in the browser (the token is in
 * localStorage), so the server draws the header both ways. This runs before
 * the first paint and marks <html> so CSS shows the right one at once — no
 * "Sign in" flashing on refresh — and puts the remembered initial and name
 * where the avatar can show them before React starts.
 */
const AUTH_HINT = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem('pupbox_token');
if(!t){d.dataset.auth='out';return;}
d.dataset.auth='in';
var m=JSON.parse(localStorage.getItem('pupbox_me')||'null');
if(m&&m.t===t.slice(-16)){if(m.initial)d.style.setProperty('--me-initial',JSON.stringify(m.initial));if(m.name)d.style.setProperty('--me-name',JSON.stringify(m.name));}
}catch(e){}})();`;

export default async function RootLayout({ children, params }: Props) {
  // Only /ka and /en exist; anything else in the first place is not a page.
  if (params.lang !== 'ka' && params.lang !== 'en') notFound();
  const [site, marketing] = await Promise.all([getStoredContent(sitePage), getMarketing()]);
  return (
    // The auth hint script adds data-auth and two CSS variables to <html> before React hydrates.
    <html lang={params.lang === 'en' ? 'en' : 'ka'} className={sans.variable} suppressHydrationWarning>
      <head>
        {/* Every page asks the API for something: start that connection while the page loads. */}
        <link rel="preconnect" href={new URL(API_URL).origin} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={new URL(API_URL).origin} />
        {/* Ownership checks and app IDs pasted in admin → SEO & tracking → Custom code: in the page as sent, where services look. */}
        {marketing?.metaTags?.map((m, i) => <meta key={i} {...(m.name ? { name: m.name } : { property: m.property })} content={m.content} />)}
      </head>
      <body className="font-sans bg-gray-50 text-gray-800">
        <script dangerouslySetInnerHTML={{ __html: AUTH_HINT }} />
        <script dangerouslySetInnerHTML={{ __html: REFRESH_TO_TOP }} />
        <LanguageProvider>
          <CartProvider>
            <RefCapture />
            <OfflineGame />
            <Header site={site} />
            <PromoPopup />
            {children}
            <AuthPopup />
            <Tracking config={marketing} />
            <Footer site={site} cookies={asksAboutCookies(marketing)} />
            <ScrollReveal />
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
