import RefCapture from '@/components/RefCapture';
import OfflineGame from '@/components/OfflineGame';
import type { Metadata, Viewport } from 'next';
import { SITE_URL, T, asLang, seo } from '@/lib/seo';
import { notFound } from 'next/navigation';
import '../globals.css';
import { Noto_Sans_Georgian } from 'next/font/google';

// Georgian-first type: renders every Georgian letter properly, clean Latin too.
const sans = Noto_Sans_Georgian({ subsets: ['georgian', 'latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-sans', display: 'swap' });
import { CartProvider } from '@/context/CartContext';
import { LanguageProvider } from '@/context/LanguageContext';
import Header from '@/components/Header';
import PromoPopup from '@/components/PromoPopup';
import Footer from '@/components/Footer';
import { sitePage } from '@pupbox/content';
import { getStoredContent } from '@/lib/content';


/**
 * Defaults for every page, in the page's language; each page sets its own
 * title, description, address and share picture on top (lib/seo.ts).
 */
type Props = { children: React.ReactNode; modal: React.ReactNode; params: { lang: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = asLang(params.lang);
  const title = T(lang, 'Pupbox — ყოველთვიური ყუთის გამოწერა საქართველოში', 'Pupbox — Monthly dog subscription boxes in Georgia');
  const description = T(lang,
    'პრემიუმ საჭმლის, სათამაშოებისა და აქსესუარების კურირებული ყოველთვიური კოლოფი შენი ძაღლისთვის. მიწოდება მთელ საქართველოში.',
    'Curated monthly boxes of premium treats, toys and accessories for your dog. Delivered across Georgia.');
  return {
    metadataBase: new URL(SITE_URL),
    ...seo({ lang, path: '/', title, description, absoluteTitle: true }),
    title: { default: title, template: '%s | Pupbox' },
    applicationName: 'Pupbox',
    keywords: ['dog subscription box', 'dog treats Georgia', 'pupbox', 'monthly dog box', 'pet subscription', 'ძაღლის გამოწერა', 'ძაღლის საჭმელი', 'pupbox საქართველო'],
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    formatDetection: { telephone: false, email: false, address: false },
    appleWebApp: { title: 'Pupbox', capable: true, statusBarStyle: 'default' },
  };
}

/** Phone browsers and in-app browsers (Instagram, Messenger…): proper width, brand colour in the bar. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#22A38B',
};

export const generateStaticParams = () => [{ lang: 'ka' }, { lang: 'en' }];

export default async function RootLayout({ children, modal, params }: Props) {
  // Only /ka and /en exist; anything else in the first place is not a page.
  if (params.lang !== 'ka' && params.lang !== 'en') notFound();
  const site = await getStoredContent(sitePage);
  return (
    <html lang={params.lang === 'en' ? 'en' : 'ka'} className={sans.variable}>
      <body className="font-sans bg-gray-50 text-gray-800">
        <LanguageProvider>
          <CartProvider>
            <RefCapture />
            <OfflineGame />
            <Header site={site} />
            <PromoPopup />
            {children}
            {modal}
            <Footer site={site} />
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
