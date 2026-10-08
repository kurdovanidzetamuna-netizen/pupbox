import type { Field, ListItem, Section, Text } from './types';
import { D } from './defaults';

/** Today's site text for an old string key, so the editor starts from what is live. */
export const d = (key: keyof typeof D): Text => D[key];
export const tx = (en: string, ka: string): Text => ({ en, ka });

/** Like d(), minus a leading emoji — for labels whose icon is now a field of its own. */
const LEADING_EMOJI = /^\p{Extended_Pictographic}\uFE0F?\s*/u;
export const bare = (key: keyof typeof D): Text => ({ en: D[key].en.replace(LEADING_EMOJI, ''), ka: D[key].ka.replace(LEADING_EMOJI, '') });

export const text = (key: string, label: string, def?: Text, help?: string): Field => ({ key, label, type: 'text', default: def, help });
export const area = (key: string, label: string, def?: Text, help?: string): Field => ({ key, label, type: 'textarea', default: def, help });
export const image = (key: string, label: string, def = '', help?: string): Field => ({ key, label, type: 'image', default: def, help });
export const icon = (key: string, label = 'Icon', def = ''): Field => ({ key, label, type: 'icon', default: def });
export const link = (key: string, label: string, def = '', help?: string): Field => ({ key, label, type: 'link', default: def, help });
export const value = (key: string, label: string, def = '', help?: string): Field => ({ key, label, type: 'value', default: def, help });
export const list = (key: string, label: string, item: Field[], def: ListItem[], help?: string): Field => ({ key, label, type: 'list', item, default: def, help });
export const note = (key: string, label: string, adminHref?: string): Field => ({ key, label, type: 'note', adminHref });

/**
 * What Google and link previews show for a page. Search engines read the
 * Georgian version — the site's default language — and English is used if
 * the Georgian is left empty.
 */
export const seo = (title: Text, description: Text, { fullTitle = false } = {}): Section => ({
  id: 'seo', label: 'Google & sharing', icon: '🔍', canHide: false,
  fields: [
    text('title', 'Title in Google results', title, fullTitle ? 'Shown exactly as written. About 50–60 characters.' : 'About 50–60 characters. " | Pupbox" is added after it.'),
    area('description', 'Description in Google results', description, 'About 150 characters: what the page offers, in plain words.'),
    image('shareImage', 'Picture when the link is shared', '', 'Optional. Shown on Facebook, WhatsApp, Messenger… Best size 1200×630.'),
  ],
});
