import type { PageDef } from '../types';
import { d, tx, text, area } from '../fields';

export const shopPage: PageDef = {
  key: 'shop',
  label: 'Shop',
  icon: '🛍️',
  path: '/shop',
  sections: [
    {
      id: 'header', label: 'Top of the page', icon: '🏷️', canHide: false,
      fields: [
        text('heading', 'Heading', d('shop.title')),
        area('description', 'Description', tx('', ''), 'Optional line under the heading.'),
      ],
    },
  ],
};

export const blogPage: PageDef = {
  key: 'blog',
  label: 'Blog',
  icon: '✍️',
  path: '/blog',
  sections: [
    {
      id: 'header', label: 'Top of the page', icon: '📰', canHide: false,
      fields: [
        text('badge', 'Small label', d('blog.badge')),
        text('heading', 'Heading', d('blog.heading')),
        area('description', 'Description', d('blog.description')),
      ],
    },
    {
      id: 'empty', label: 'When there are no posts', icon: '🗒️', canHide: false,
      fields: [
        text('heading', 'Heading', d('blog.empty')),
        area('description', 'Description', d('blog.empty.desc')),
      ],
    },
  ],
};
