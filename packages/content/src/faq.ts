import { D } from './defaults';

/** Pages that show questions from the FAQ manager. */
export const FAQ_PAGES = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'how-it-works', label: 'How It Works', icon: '⚙️' },
] as const;

export const FAQ_SLUG = 'config-faq-global';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  questionKa: string;
  answerKa: string;
  pages: string[];
  sortOrder: number;
}

const q = (n: number, pages: string[]): FaqItem => ({
  id: `default-${n}`,
  question: D[`faq.q${n}` as keyof typeof D].en,
  answer: D[`faq.a${n}` as keyof typeof D].en,
  questionKa: D[`faq.q${n}` as keyof typeof D].ka,
  answerKa: D[`faq.a${n}` as keyof typeof D].ka,
  pages,
  sortOrder: n,
});

/** Today's questions, used until the FAQ manager is saved for the first time. */
export const DEFAULT_FAQ: FaqItem[] = [
  q(1, ['home', 'how-it-works']),
  q(2, ['home', 'how-it-works']),
  q(3, ['home', 'how-it-works']),
  q(4, ['home', 'how-it-works']),
  q(5, ['home', 'how-it-works']),
  q(6, ['how-it-works']),
  q(7, ['how-it-works']),
  q(8, ['how-it-works']),
  q(9, ['how-it-works']),
];

/**
 * The saved questions (or the defaults if the FAQ manager was never saved —
 * an emptied list stays empty), those for `page`, in order, in the visitor's language.
 */
export function faqFor(page: string, saved: FaqItem[] | null | undefined, lang: 'en' | 'ka') {
  const items = saved ?? DEFAULT_FAQ;
  return items
    .filter((i) => !i.pages?.length || i.pages.includes(page))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((i) => ({
      q: (lang === 'ka' && i.questionKa?.trim()) || i.question,
      a: (lang === 'ka' && i.answerKa?.trim()) || i.answer,
    }))
    .filter((i) => i.q?.trim());
}
