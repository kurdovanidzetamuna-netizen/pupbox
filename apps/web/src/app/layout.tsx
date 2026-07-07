import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { LanguageProvider } from '@/context/LanguageContext';
import Header from '@/components/Header';
import PromoPopup from '@/components/PromoPopup';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge';

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'Pupbox — ყოველთვიური კუთხის გამოწერა საქართველოში',
    template: '%s | Pupbox',
  },
  description: 'პრემიუმ საჭმლის, სათამაშოებისა და აქსესუარების კურირებული ყოველთვიური კოლოფი შენი ძაღლისთვის. მიწოდება მთელ საქართველოში.',
  keywords: ['dog subscription box', 'dog treats Georgia', 'pupbox', 'monthly dog box', 'pet subscription', 'ძაღლის გამოწერა', 'pupbox საქართველო'],
  openGraph: {
    type: 'website',
    locale: 'ka_GE',
    url: BASE,
    siteName: 'Pupbox',
    title: 'Pupbox — ყოველთვიური კუთხის გამოწერა',
    description: 'პრემიუმ საჭმლის, სათამაშოებისა და აქსესუარების კურირებული ყოველთვიური კოლოფი შენი ძაღლისთვის.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pupbox — ყოველთვიური კუთხის გამოწერა',
    description: 'პრემიუმ საჭმლის, სათამაშოებისა და აქსესუარების კურირებული ყოველთვიური კოლოფი შენი ძაღლისთვის.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: BASE },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka">
      <body>
        <LanguageProvider>
          <CartProvider>
            <Header />
            <PromoPopup />
            {children}
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
