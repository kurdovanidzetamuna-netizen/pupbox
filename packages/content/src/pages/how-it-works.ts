import type { PageDef } from '../types';
import { d, bare, text, area, icon, link, list, note } from '../fields';

export const howItWorksPage: PageDef = {
  key: 'how-it-works',
  label: 'How It Works',
  icon: '⚙️',
  path: '/how-it-works',
  sections: [
    {
      id: 'hero', label: 'Top of the page', icon: '🌟', canHide: false,
      fields: [
        text('badge', 'Small label', d('hiw.page.badge')),
        text('heading', 'Heading', d('hiw.page.heading')),
        text('headingAccent', 'Coloured end of the heading', d('hiw.page.headingAccent')),
        area('description', 'Description', d('hiw.page.description')),
      ],
    },
    {
      id: 'steps', label: 'Steps', icon: '👣', canHide: false,
      fields: [
        list('items', 'Steps', [icon('icon'), text('title', 'Title'), area('desc', 'Description')], [
          { icon: '📋', title: d('hiw.page.step1.title'), desc: d('hiw.page.step1.desc') },
          { icon: '🐶', title: d('hiw.page.step2.title'), desc: d('hiw.page.step2.desc') },
          { icon: '🎁', title: d('hiw.page.step3.title'), desc: d('hiw.page.step3.desc') },
          { icon: '🚚', title: d('hiw.page.step4.title'), desc: d('hiw.page.step4.desc') },
          { icon: '🎉', title: d('hiw.page.step5.title'), desc: d('hiw.page.step5.desc') },
        ]),
      ],
    },
    {
      id: 'cta', label: 'Call to action', icon: '🎯',
      fields: [
        text('badge', 'Small label', d('hiw.page.badge')),
        text('heading', 'Heading', d('hiw.page.cta.heading')),
        area('description', 'Description', d('hiw.page.cta.desc')),
        list('chips', 'Small highlights', [icon('icon'), text('label', 'Text')], [
          { icon: '🐾', label: d('cta.socialProof') },
          { icon: '📦', label: d('hiw.step4.title') },
          { icon: '⭐', label: bare('cta.trustChip4') },
        ]),
        text('button1Text', 'Main button text', d('hiw.page.cta.btn1')),
        link('button1Href', 'Main button goes to', '/prices'),
        text('button2Text', 'Second button text', d('hiw.page.cta.btn2')),
        link('button2Href', 'Second button goes to', '/prices'),
      ],
    },
    {
      id: 'faq', label: 'Questions & answers', icon: '❓',
      fields: [
        text('heading', 'Heading', d('hiw.page.faq.heading')),
        text('description', 'Description', d('hiw.page.faq.sub')),
        note('faq', 'The questions themselves are in the FAQ manager — tick "How It Works" on the ones to show here.', '/dashboard/faq'),
      ],
    },
  ],
};
