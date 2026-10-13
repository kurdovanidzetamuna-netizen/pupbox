import type { Metadata } from 'next';
import { T, asLang, seo } from '@/lib/seo';
import AccountShell from './AccountShell';

/** A private page: a proper title, but kept out of search results. */
export const generateMetadata = ({ params }: { params: { lang: string } }): Metadata => {
  const lang = asLang(params.lang);
  return seo({ lang, path: '/account', title: T(lang, 'ჩემი ანგარიში', 'My account'), description: T(lang, 'Pupbox — ყოველთვიური ყუთი შენი ძაღლისთვის. მიწოდება მთელ საქართველოში.', 'Pupbox — a monthly box for your dog, delivered across Georgia.'), noindex: true });
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
