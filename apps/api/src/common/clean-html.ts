import sanitizeHtml from 'sanitize-html';

/**
 * Rich text written in admin (blog posts, Terms/Privacy pages) is shown to
 * every visitor as HTML. Keep the formatting, drop anything that could run:
 * scripts, event handlers, javascript: links, iframes, styles that hide
 * things. Otherwise anyone with edit rights could run code in customers'
 * browsers and take their sign-ins.
 */
export function cleanHtml(html: unknown): string {
  if (typeof html !== 'string') return '';
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'section',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'],
      '*': ['class', 'id'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    // Links that open a new tab can't reach back into this page.
    transformTags: { a: (tag, attribs) => ({ tagName: 'a', attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer' } : attribs }) },
  });
}

/** The same for CMS content objects ({ html } and translations.<lang>.content.html). */
export function cleanCmsContent<T>(content: T): T {
  if (content && typeof content === 'object' && typeof (content as any).html === 'string') {
    return { ...(content as any), html: cleanHtml((content as any).html) };
  }
  return content;
}
