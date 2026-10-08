import type { PageDef } from '../types';
import { d, image, icon, link, list, note, text, area, value, tx } from '../fields';

const navItem = [text('label', 'Label'), link('href', 'Goes to', '', 'A page on the site, e.g. /prices, or a full https:// address')];

/** Header and footer: on every page of the site. */
export const sitePage: PageDef = {
  key: 'site',
  label: 'Header & Footer',
  icon: '🧭',
  path: '/',
  sections: [
    {
      id: 'brand', label: 'Logo', icon: '🐾', canHide: false,
      fields: [
        image('logoImage', 'Logo image', '', 'Optional. A wide logo (PNG or SVG, about 160×40). When set, it replaces the icon and name below.'),
        icon('logoIcon', 'Logo icon', '🐾'),
        value('name', 'Brand name', 'Pupbox'),
      ],
    },
    {
      id: 'header', label: 'Header menu', icon: '🧭', canHide: false,
      fields: [
        list('links', 'Menu links', navItem, [
          { label: d('nav.howItWorks'), href: '/how-it-works' },
          { label: d('nav.pricing'), href: '/prices' },
          { label: d('nav.shop'), href: '/shop' },
          { label: d('nav.blog'), href: '/blog' },
        ]),
        text('buttonText', 'Button text', d('nav.subscribe')),
        link('buttonHref', 'Button goes to', '/prices'),
        note('fixed', 'The cart, sign-in and language switch are always shown. Their labels are in Translations.', '/dashboard/translations'),
      ],
    },
    {
      id: 'footer', label: 'Footer', icon: '🦶', canHide: false,
      fields: [
        area('tagline', 'Short description', d('footer.tagline')),
        text('column1Title', 'First column title', d('footer.company')),
        list('column1Links', 'First column links', navItem, [
          { label: d('nav.howItWorks'), href: '/how-it-works' },
          { label: d('nav.pricing'), href: '/prices' },
          { label: d('nav.shop'), href: '/shop' },
          { label: d('nav.blog'), href: '/blog' },
        ]),
        text('column2Title', 'Second column title', d('footer.account')),
        list('column2Links', 'Second column links', navItem, [
          { label: d('nav.signIn'), href: '/login' },
          { label: d('footer.createAccount'), href: '/register' },
          { label: d('footer.myOrders'), href: '/account/orders' },
          { label: d('nav.subscribe'), href: '/prices' },
        ]),
        text('copyright', 'Copyright line', d('footer.copyright'), 'Shown after "© <year> <brand name>."'),
        list('legalLinks', 'Bottom links', navItem, [
          { label: d('footer.privacy'), href: '/pages/privacy' },
          { label: d('footer.terms'), href: '/pages/terms' },
        ]),
        note('legal', 'The Terms and Privacy pages themselves are edited in Pages.', '/dashboard/cms'),
      ],
    },
    {
      id: 'contact', label: 'Contact details', icon: '📞',
      fields: [
        value('email', 'Email', '', 'Shown in the footer when filled in.'),
        value('phone', 'Phone', ''),
        text('address', 'Address', tx('', '')),
        text('hours', 'Working hours', tx('', '')),
      ],
    },
    {
      id: 'social', label: 'Social links', icon: '🔗',
      fields: [
        link('instagram', 'Instagram', '', 'Full address, e.g. https://instagram.com/pupbox.ge. Empty ones are hidden.'),
        link('facebook', 'Facebook', ''),
        link('tiktok', 'TikTok', ''),
      ],
    },
  ],
};
