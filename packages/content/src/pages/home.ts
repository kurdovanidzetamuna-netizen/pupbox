import type { PageDef } from '../types';
import { d, tx, text, area, image, icon, link, value, list, note } from '../fields';

export const homePage: PageDef = {
  key: 'homepage',
  label: 'Home Page',
  icon: '🏠',
  path: '/',
  sections: [
    {
      id: 'hero', label: 'Top of the page', icon: '🌟',
      fields: [
        text('badge', 'Small label above the heading', d('hero.badge')),
        text('heading', 'Main heading', d('hero.heading')),
        text('headingAccent', 'Coloured part of the heading', d('hero.headingAccent'), 'Must match the end of the main heading exactly; it is shown in teal.'),
        area('description', 'Description', d('hero.description')),
        text('cta1Text', 'Main button text', d('hero.cta1')),
        link('cta1Href', 'Main button goes to', '/prices'),
        text('cta2Text', 'Gift button text', d('hero.cta2')),
        link('cta2Href', 'Gift button goes to', '/prices?gift=true'),
        list('steps', 'Steps under the buttons', [icon('icon'), text('label', 'Label')], [
          { icon: '📋', label: d('hero.step1') },
          { icon: '🐾', label: d('hero.step2') },
          { icon: '🎁', label: d('hero.step3') },
          { icon: '🚚', label: d('hero.step4') },
        ]),
        text('stepsNote', 'Line under the steps', d('hero.cancelNote')),
        image('imageUrl', 'Photo', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80'),
        text('imageAlt', 'Photo description (for screen readers and Google)', tx('Happy dog with Pupbox', 'ბედნიერი ძაღლი Pupbox-ის კოლოფით')),
        icon('cardIcon', 'Card icon on the photo', '📦'),
        text('cardTitle', 'Card title on the photo', d('hero.card.title')),
        text('cardSub', 'Card line on the photo', d('hero.card.sub')),
        text('rating', 'Rating badge text', d('hero.card.rating'), 'Placeholder until launch — remove or replace with real reviews.'),
      ],
    },
    {
      id: 'stats', label: 'Numbers bar', icon: '📊',
      fields: [
        list('items', 'Numbers', [value('value', 'Number', '', 'e.g. 500+'), text('label', 'Label')], [
          { value: '500+', label: d('stats.happyDogs') },
          { value: '4.9★', label: d('stats.avgRating') },
          { value: '5–8', label: d('stats.productsPerBox') },
        ], 'Placeholder numbers until launch.'),
      ],
    },
    {
      id: 'whatsInBox', label: "What's in the box", icon: '📦',
      fields: [
        text('heading', 'Heading', d('box.heading')),
        area('description', 'Description', d('box.description')),
        list('items', 'Cards', [icon('icon'), text('title', 'Title'), area('desc', 'Description')], [
          { icon: '🦴', title: d('box.item1.title'), desc: d('box.item1.desc') },
          { icon: '🧸', title: d('box.item2.title'), desc: d('box.item2.desc') },
          { icon: '✨', title: d('box.item3.title'), desc: d('box.item3.desc') },
          { icon: '🎁', title: d('box.item4.title'), desc: d('box.item4.desc') },
          { icon: '🐶', title: d('box.item5.title'), desc: d('box.item5.desc') },
          { icon: '📦', title: d('box.item6.title'), desc: d('box.item6.desc') },
        ]),
      ],
    },
    {
      id: 'howItWorks', label: 'How it works', icon: '⚙️',
      fields: [
        text('heading', 'Heading', d('hiw.heading')),
        text('description', 'Description', d('hiw.subheading')),
        list('steps', 'Steps', [icon('icon'), text('title', 'Title'), area('desc', 'Description')], [
          { icon: '📋', title: d('hiw.step1.title'), desc: d('hiw.step1.desc') },
          { icon: '🐶', title: d('hiw.step2.title'), desc: d('hiw.step2.desc') },
          { icon: '📦', title: d('hiw.step3.title'), desc: d('hiw.step3.desc') },
          { icon: '🎉', title: d('hiw.step4.title'), desc: d('hiw.step4.desc') },
        ]),
      ],
    },
    {
      id: 'plans', label: 'Plans', icon: '💰',
      fields: [
        text('heading', 'Heading', d('plans.heading')),
        text('description', 'Description', d('plans.subheading')),
        note('plans', 'The plans themselves — names, prices, which are shown — are managed in Subscription Plans.', '/dashboard/subscription-plans'),
      ],
    },
    {
      id: 'testimonials', label: 'Reviews', icon: '⭐',
      fields: [
        text('heading', 'Heading', d('testimonials.heading')),
        text('description', 'Description', d('testimonials.subheading')),
        list('items', 'Reviews', [
          text('name', 'Customer name'),
          text('dog', 'Dog breed'),
          area('quote', 'Review'),
          image('image', 'Photo'),
        ], [
          { name: tx('Nino T.', 'ნინო თ.'), dog: tx('Golden Retriever', 'გოლდენ რეტრივერი'), quote: d('testimonials.t1.quote'), image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=100&q=80' },
          { name: tx('Giorgi K.', 'გიორგი კ.'), dog: tx('French Bulldog', 'ფრანგული ბულდოგი'), quote: d('testimonials.t2.quote'), image: 'https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=100&q=80' },
          { name: tx('Salome M.', 'სალომე მ.'), dog: tx('Labrador', 'ლაბრადორი'), quote: d('testimonials.t3.quote'), image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=100&q=80' },
        ], 'Placeholder reviews until launch — replace with real customers.'),
      ],
    },
    {
      id: 'faq', label: 'Questions & answers', icon: '❓',
      fields: [
        text('heading', 'Heading', d('faq.heading')),
        note('faq', 'The questions themselves are in the FAQ manager — tick "Home" on the ones to show here.', '/dashboard/faq'),
      ],
    },
  ],
};
