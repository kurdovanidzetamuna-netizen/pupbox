import type { Field, Lang, PageDef, StoredContent, Text } from './types';

export const cmsSlug = (page: PageDef) => `config-${page.key}`;

const isText = (v: unknown): v is Text =>
  !!v && typeof v === 'object' && !Array.isArray(v) && ('en' in v || 'ka' in v);

/** Words fields; everything else is the same in both languages. */
export const isTranslatable = (f: Field) => f.type === 'text' || f.type === 'textarea';

/** A field's value: what admin saved if anything, otherwise today's default. */
function valueOf(field: Field, saved: Record<string, unknown> | undefined): unknown {
  const v = saved?.[field.key];
  return v === undefined ? field.default : v;
}

/**
 * Every field of every section with saved values laid over the defaults —
 * what the admin editor starts from, and what gets saved back.
 */
export function mergedSections(page: PageDef, stored?: StoredContent | null): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const s of page.sections) {
    const saved = stored?.sections?.[s.id];
    out[s.id] = {};
    for (const f of s.fields) if (f.type !== 'note') out[s.id][f.key] = structuredClone(valueOf(f, saved) ?? emptyValue(f));
  }
  return out;
}

export function emptyValue(f: Field): Text | string | unknown[] {
  if (f.type === 'list') return [];
  return isTranslatable(f) ? { en: '', ka: '' } : '';
}

/** Text in the visitor's language; an empty Georgian falls back to English rather than showing nothing. */
export function pickText(v: unknown, lang: Lang): string {
  if (typeof v === 'string') return v;
  if (!isText(v)) return '';
  return (lang === 'ka' ? v.ka?.trim() || v.en : v.en?.trim() || v.ka) || '';
}

function localizeFields(fields: Field[], values: Record<string, unknown>, lang: Lang): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    if (f.type === 'note') continue;
    const v = values[f.key];
    if (f.type === 'list') {
      out[f.key] = Array.isArray(v) ? v.map((item) => localizeFields(f.item ?? [], item as Record<string, unknown>, lang)) : [];
    } else {
      out[f.key] = isTranslatable(f) ? pickText(v, lang) : typeof v === 'string' ? v : '';
    }
  }
  return out;
}

export interface PageContent {
  /** Is this section switched on in admin? */
  on: (sectionId: string) => boolean;
  /** Section values in the visitor's language: strings, and arrays of items for lists. */
  [sectionId: string]: any;
}

/** The page ready to render: one object per section, in the visitor's language. */
export function localizePage(page: PageDef, stored: StoredContent | null | undefined, lang: Lang): PageContent {
  const merged = mergedSections(page, stored);
  const out: PageContent = { on: (id) => stored?.enabled?.[id] !== false };
  for (const s of page.sections) out[s.id] = localizeFields(s.fields, merged[s.id], lang);
  return out;
}
