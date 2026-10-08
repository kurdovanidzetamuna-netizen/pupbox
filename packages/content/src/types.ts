export type Lang = 'en' | 'ka';

/** A piece of text in both languages. */
export interface Text { en: string; ka: string }

/**
 * - text / textarea: words, in English and Georgian
 * - image: a picture (uploaded or a link), the same in both languages
 * - icon: an emoji, the same in both languages
 * - link: where a button or menu item goes, e.g. "/prices"
 * - value: a short fixed value shown as is, e.g. "500+" or a brand name
 * - list: repeatable items (steps, reviews, menu links), each made of `item` fields
 * - note: guidance for the editor, never shown on the site
 */
export type FieldType = 'text' | 'textarea' | 'image' | 'icon' | 'link' | 'value' | 'list' | 'note';

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  /** Today's content, shown until someone changes it in admin. */
  default?: Text | string | ListItem[];
  /** For lists: what each item is made of. */
  item?: Field[];
  /** For notes: an admin page the note points to. */
  adminHref?: string;
}

export type ListItem = Record<string, Text | string | ListItem[]>;

export interface Section {
  id: string;
  label: string;
  icon: string;
  fields: Field[];
  /** False for sections the page can't do without (e.g. the header). */
  canHide?: boolean;
}

export interface PageDef {
  /** Also the admin URL: /dashboard/page-builder/<key>. Stored as CMS page `config-<key>`. */
  key: string;
  label: string;
  icon: string;
  /** Where the page lives on the site, for "Preview". */
  path: string;
  sections: Section[];
}

/** What admin saves for a page: values per section, and which sections are switched off. */
export interface StoredContent {
  version?: number;
  sections?: Record<string, Record<string, unknown>>;
  enabled?: Record<string, boolean>;
}
