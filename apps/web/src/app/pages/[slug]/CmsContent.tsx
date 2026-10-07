'use client';
import { useLanguage } from '@/context/LanguageContext';

/**
 * A CMS page's title and body in the visitor's language. The Georgian
 * version lives in translations.ka (title, html); without it the page falls
 * back to the default content rather than showing nothing.
 */
export default function CmsContent({ title, html, text, kaTitle, kaHtml }: {
  title: string; html?: string; text?: string; kaTitle?: string; kaHtml?: string;
}) {
  const { lang } = useLanguage();
  const useKa = lang === 'ka' && !!kaHtml?.trim();
  const body = useKa ? kaHtml : html;

  return (
    <>
      <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-8 [overflow-wrap:anywhere]">{useKa && kaTitle ? kaTitle : title}</h1>
      {body ? (
        // Admin-authored HTML from our own CMS, not user input.
        <div className="cms-prose" dangerouslySetInnerHTML={{ __html: body }} />
      ) : text ? (
        <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">{text}</div>
      ) : (
        <p className="text-gray-400">{lang === 'ka' ? 'ამ გვერდს ჯერ შინაარსი არ აქვს.' : 'This page has no content yet.'}</p>
      )}
    </>
  );
}
