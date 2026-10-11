import RefCapture from '@/components/RefCapture';
import OfflineGame from '@/components/OfflineGame';
import type { Metadata } from 'next';
import './globals.css';
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

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge';

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'Pupbox — ყოველთვიური ყუთის გამოწერა საქართველოში',
    template: '%s | Pupbox',
  },
  description: 'პრემიუმ საჭმლის, სათამაშოებისა და აქსესუარების კურირებული ყოველთვიური კოლოფი შენი ძაღლისთვის. მიწოდება მთელ საქართველოში.',
  keywords: ['dog subscription box', 'dog treats Georgia', 'pupbox', 'monthly dog box', 'pet subscription', 'ძაღლის გამოწერა', 'pupbox საქართველო'],
  openGraph: {
    type: 'website',
    locale: 'ka_GE',
    url: BASE,
    siteName: 'Pupbox',
    title: 'Pupbox — ყოველთვიური ყუთის გამოწერა',
    description: 'პრემიუმ საჭმლის, სათამაშოებისა და აქსესუარების კურირებული ყოველთვიური კოლოფი შენი ძაღლისთვის.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pupbox — ყოველთვიური ყუთის გამოწერა',
    description: 'პრემიუმ საჭმლის, სათამაშოებისა და აქსესუარების კურირებული ყოველთვიური კოლოფი შენი ძაღლისთვის.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: BASE },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getStoredContent(sitePage);
  return (
    <html lang="ka" className={sans.variable}>
      <body className="font-sans bg-gray-50 text-gray-800">
        <LanguageProvider>
          <CartProvider>
            <RefCapture />
            <OfflineGame />
            <Header site={site} />
            <PromoPopup />
            {children}
            <Footer site={site} />
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
