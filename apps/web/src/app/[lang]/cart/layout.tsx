import type { Metadata } from 'next';
import { T, asLang, seo } from '@/lib/seo';

/** A private page: a proper title, but kept out of search results. */
export const generateMetadata = ({ params }: { params: { lang: string } }): Metadata => {
  const lang = asLang(params.lang);
  return seo({ lang, path: '/cart', title: T(lang, 'კალათა', 'Basket'), description: T(lang, 'Pupbox — ყოველთვიური ყუთი შენი ძაღლისთვის. მიწოდება მთელ საქართველოში.', 'Pupbox — a monthly box for your dog, delivered across Georgia.'), noindex: true });
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
