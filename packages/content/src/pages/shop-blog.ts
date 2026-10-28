import type { PageDef } from '../types';
import { d, tx, text, area, icon, list, seo } from '../fields';

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
        area('description', 'Description', tx('Treats, toys and care for happy dogs — delivered across Georgia.', 'ნუგბარი, სათამაშოები და მოვლის საშუალებები ბედნიერი ძაღლებისთვის — მიწოდება მთელ საქართველოში.'), 'Line under the heading.'),
      ],
    },
    {
      id: 'perks', label: 'Small promises under the search', icon: '✨',
      fields: [
        list('items', 'Items', [icon('icon'), text('text', 'Text (a few words)')], [
          { icon: '🚚', text: tx('Delivery across Georgia', 'მიწოდება საქართველოში') },
          { icon: '🔒', text: tx('Secure payment', 'უსაფრთხო გადახდა') },
          { icon: '🐾', text: tx('Picked for dogs', 'შერჩეული ძაღლებისთვის') },
        ]),
      ],
    },
    seo(
      tx('Dog treats, toys & accessories shop', 'ძაღლის ნუგბარი, სათამაშოები და აქსესუარები'),
      tx('Shop premium dog treats, chews, toys, grooming and accessories in one place — sorted by size and age, delivered across Georgia.', 'იყიდე ძაღლის პრემიუმ ნუგბარი, საღეჭი, სათამაშოები, მოვლის საშუალებები და აქსესუარები ერთ ადგილას — ზომისა და ასაკის მიხედვით, მიწოდებით მთელ საქართველოში.'),
    ),
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
    seo(
      tx('Dog care blog', 'ძაღლის მოვლის ბლოგი'),
      tx('Breed guides, training tips, health advice and more from the Pupbox team.', 'ჯიშის გიდები, ვარჯიშის რჩევები, ჯანმრთელობის ინფორმაცია და სხვა — Pupbox-ის გუნდისგან.'),
    ),
  ],
};
