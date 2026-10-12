import { SITE_URL, atLang, type Lang } from '@/lib/seo';

/** Structured data for search engines (schema.org), as one <script>. */
export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

/** Home › … › this page, for the path shown under a search result. */
export function breadcrumbs(lang: Lang, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE_URL}${atLang(it.path, lang)}` })),
  };
}

export const ORG = {
  '@type': 'Organization',
  name: 'Pupbox',
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
};
