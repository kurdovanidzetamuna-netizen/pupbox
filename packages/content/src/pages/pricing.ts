import type { PageDef } from '../types';
import { d, bare, tx, text, area, icon, list, note, seo } from '../fields';

const item = (iconChar: string, en: [string, string], ka: [string, string]) =>
  ({ icon: iconChar, name: tx(en[0], ka[0]), desc: tx(en[1], ka[1]) });

export const pricingPage: PageDef = {
  key: 'pricing',
  label: 'Pricing Page',
  icon: '💳',
  path: '/prices',
  sections: [
    {
      id: 'header', label: 'Top of the page', icon: '🏷️', canHide: false,
      fields: [
        text('heading', 'Heading', d('pricing.hero.heading')),
        text('description', 'Description', d('pricing.hero.sub')),
      ],
    },
    {
      id: 'plans', label: 'Plans', icon: '🗂️', canHide: false,
      fields: [
        note('plansNote', 'The plans themselves (name, price, benefits, badge, gift on/off) are edited in Subscription Plans. Here: the words around them, on this page and on Home.', '/dashboard/subscription-plans'),
        text('toggleMine', 'Switch: for my dog', d('pricing.toggle.myDog')),
        text('toggleGift', 'Switch: as a gift', d('pricing.toggle.gift')),
        text('giftHeading', 'Gift note: heading', d('pricing.gift.heading')),
        area('giftBanner', 'Gift note: text', d('pricing.gift.banner')),
        text('giftCard', 'Gift card line', d('pricing.gift.card'), '{plan} is replaced by the plan name.'),
        text('cta', 'Card button', d('pricing.planCard.cta')),
        text('giftCta', 'Card button (gift)', d('pricing.planCard.giftCta')),
        text('popular', 'Badge: Most popular', d('pricing.planCard.popular')),
        text('bestValue', 'Badge: Best value', d('pricing.planCard.bestValue')),
        text('giftBadge', 'Badge on gift cards', d('pricing.planCard.gift')),
        text('freeDelivery', 'Free delivery line', d('pricing.planCard.freeDelivery'), 'Shown when a plan includes delivery but its benefits don’t say so.'),
        text('more', 'More benefits link', d('plan.more'), '{n} is replaced by how many more.'),
        text('included', 'Pop-up: list heading', d('plan.included')),
        text('chooseThis', 'Pop-up: button', d('plan.chooseThis')),
        text('giftThis', 'Pop-up: button (gift)', d('plan.giftThis')),
        text('empty', 'When there are no plans', d('pricing.none')),
      ],
    },
    {
      id: 'boxContents', label: "What's in the box", icon: '📦',
      fields: [
        text('badge', 'Small label', d('boxContents.heading')),
        text('heading', 'Heading', d('boxContents.sub')),
        list('tabs', 'Tabs', [
          icon('icon'),
          text('label', 'Tab name'),
          list('items', 'Items', [icon('icon'), text('name', 'Name'), area('desc', 'Description')], []),
        ], [
          { icon: '🦴', label: bare('boxContents.tab.treats'), items: [
            item('🥩', ['Meat Chews', 'Natural dried meat snacks, perfect for medium & large breeds.'], ['ხორცის საღეჭი', 'ბუნებრივი გამხმარი ხორცის სნეკები, იდეალური საშუალო და დიდი ჯიშებისთვის.']),
            item('🐟', ['Fish Bites', 'Omega-rich salmon treats — great for coat health.'], ['თევზის ნაჭრები', 'ომეგათი მდიდარი ორაგულის ნუგბარი — კარგია ბეწვისთვის.']),
            item('🥕', ['Veggie Crunchers', 'Light, low-calorie carrot & sweet potato bites.'], ['ბოსტნეულის ხრაშუნები', 'მსუბუქი, დაბალკალორიული სტაფილოსა და ბატატის ნაჭრები.']),
            item('🍗', ['Chicken Jerky', 'Slow-baked chicken strips — a crowd favourite.'], ['ქათმის ჩირი', 'ნელა გამომცხვარი ქათმის ზოლები — ყველას საყვარელი.']),
            item('🧀', ['Cheese Puffs', 'Soft mini bites, ideal for training rewards.'], ['ყველის ბურთულები', 'რბილი პატარა ნაჭრები, იდეალური წვრთნისას წასახალისებლად.']),
            item('🍪', ['Baked Biscuits', 'Artisan baked biscuits, grain-free options available.'], ['გამომცხვარი ბისკვიტები', 'ხელნაკეთი ბისკვიტები, ხელმისაწვდომია უმარცვლო ვარიანტებიც.']),
          ] },
          { icon: '🧸', label: bare('boxContents.tab.toys'), items: [
            item('🪀', ['Rope Toy', 'Durable braided rope — great for tug-of-war.'], ['თოკის სათამაშო', 'გამძლე დაწნული თოკი — იდეალური ჭიდილის თამაშისთვის.']),
            item('🦆', ['Squeaky Duck', 'Non-toxic plush toy with satisfying squeak.'], ['წრიპინა იხვი', 'არატოქსიკური რბილი სათამაშო სასიამოვნო წრიპინით.']),
            item('🏀', ['Bounce Ball', 'High-bounce rubber ball, safe for all breeds.'], ['ხტუნია ბურთი', 'კარგად მხტომი რეზინის ბურთი, უსაფრთხო ყველა ჯიშისთვის.']),
            item('🧩', ['Puzzle Feeder', 'Slow-feed puzzle that keeps your pup mentally sharp.'], ['თავსატეხი საკვებური', 'ნელი კვების თავსატეხი, რომელიც ლეკვის გონებას ავარჯიშებს.']),
            item('🪃', ['Fetch Stick', 'Lightweight fetch toy, floats on water.'], ['მოსატანი ჯოხი', 'მსუბუქი სათამაშო მოსატანად, წყალზე ტივტივებს.']),
            item('🐿️', ['Crinkle Squirrel', 'Crinkly hide-and-seek plush, multiple pieces.'], ['შრიალა ციყვი', 'შრიალა რბილი სათამაშო დამალობანასთვის, რამდენიმე ნაწილით.']),
          ] },
          { icon: '✨', label: bare('boxContents.tab.grooming'), items: [
            item('🧴', ['Dog Shampoo', 'Hypoallergenic formula, gentle on sensitive skin.'], ['ძაღლის შამპუნი', 'ჰიპოალერგიული ფორმულა, ნაზი მგრძნობიარე კანისთვის.']),
            item('💆', ['Massage Glove', 'Rubber grooming glove for bonding & shedding control.'], ['სამასაჟო ხელთათმანი', 'რეზინის ხელთათმანი მოვლისთვის — სიახლოვე და ნაკლები ბეწვი სახლში.']),
            item('🪥', ['Dental Chew', 'Enzymatic dental sticks — fresher breath daily.'], ['კბილის საღეჭი', 'ფერმენტული კბილის ჩხირები — ყოველდღე სუფთა სუნთქვა.']),
            item('💅', ['Paw Balm', 'Softens and protects dry paw pads.'], ['თათის ბალზამი', 'არბილებს და იცავს მშრალ თათებს.']),
            item('🌿', ['Ear Cleanser', 'Gentle, vet-approved ear cleaning solution.'], ['ყურის საწმენდი', 'ნაზი, ვეტერინარის მიერ მოწონებული ყურის საწმენდი ხსნარი.']),
            item('🪮', ['Dematting Comb', 'Ergonomic comb for tangle-free coats.'], ['ბეწვის სავარცხელი', 'ერგონომიული სავარცხელი ბეწვის ჩახლართვის წინააღმდეგ.']),
          ] },
          { icon: '🎀', label: bare('boxContents.tab.accessories'), items: [
            item('🎀', ['Bandana', 'Seasonal printed cotton bandana — snap-on style.'], ['ბანდანა', 'სეზონური ბამბის ბანდანა ღილით.']),
            item('🏷️', ['ID Tag', 'Laser-engraved stainless steel ID tag.'], ['მედალიონი', 'ლაზერით გრავირებული უჟანგავი ფოლადის მედალიონი.']),
            item('🦺', ['Mini Harness', 'Lightweight mesh harness included in select plans.'], ['მინი აღკაზმულობა', 'მსუბუქი ბადისებრი აღკაზმულობა, შერჩეულ გეგმებში.']),
            item('🥣', ['Travel Bowl', 'Collapsible silicone bowl, fits in any bag.'], ['სამგზავრო ჯამი', 'დასაკეცი სილიკონის ჯამი, ნებისმიერ ჩანთაში ეტევა.']),
            item('🧣', ['Fleece Scarf', 'Cosy winter scarf, one size fits most breeds.'], ['ფლისის შარფი', 'თბილი ზამთრის შარფი, ერგება ჯიშების უმეტესობას.']),
            item('🪪', ['Membership Card', 'Personalised Pupbox member card for your pup.'], ['წევრის ბარათი', 'პერსონალური Pupbox-ის წევრის ბარათი შენი ლეკვისთვის.']),
          ] },
          { icon: '🎁', label: bare('boxContents.tab.surprise'), items: [
            item('🎉', ['Mystery Item', 'A handpicked bonus product — different every month.'], ['საიდუმლო ნივთი', 'ხელით შერჩეული ბონუს პროდუქტი — ყოველ თვე სხვა.']),
            item('🏆', ['Premium Upgrade', 'Best Value & Annual plans get an exclusive premium item.'], ['პრემიუმ დამატება', 'Best Value და წლიურ გეგმებს ექსკლუზიური პრემიუმ ნივთი მოყვება.']),
            item('💌', ['Pup Letter', 'A personal note from the Pupbox team with tips & stories.'], ['წერილი ლეკვს', 'პირადი წერილი Pupbox-ის გუნდისგან რჩევებითა და ისტორიებით.']),
            item('🌟', ['Seasonal Special', 'Holiday & seasonal editions with themed items.'], ['სეზონური გამოცემა', 'სადღესასწაულო და სეზონური გამოცემები თემატური ნივთებით.']),
            item('🎟️', ['Referral Voucher', 'Share with a friend — they get ₾10 off their first box.'], ['მოწვევის ვაუჩერი', 'გაუზიარე მეგობარს — პირველ კოლოფზე ₾10 ფასდაკლებას მიიღებს.']),
            item('📸', ['Photo Frame', "Mini frame for your pup's unboxing moment."], ['ფოტოჩარჩო', 'პატარა ჩარჩო შენი ლეკვის კოლოფის გახსნის მომენტისთვის.']),
          ] },
        ]),
        area('note', 'Line under the items', d('boxContents.note')),
      ],
    },
    {
      id: 'includes', label: 'Every plan includes', icon: '✅',
      fields: [
        text('heading', 'Heading', d('pricing.includes.heading')),
        text('description', 'Line under the heading', d('pricing.includes.sub')),
        text('cta', 'Link to the plans', d('pricing.includes.cta')),
        list('items', 'Items', [icon('icon'), text('text', 'Text')], [
          { icon: '📦', text: d('pricing.includes.i1') },
          { icon: '🚚', text: d('pricing.includes.i2') },
          { icon: '🐾', text: d('pricing.includes.i3') },
          { icon: '💬', text: d('pricing.includes.i4') },
          { icon: '🔄', text: d('pricing.includes.i5') },
          { icon: '🎁', text: d('pricing.includes.i6') },
        ]),
      ],
    },
    seo(
      tx('Pricing and plans', 'ფასები და გეგმები'),
      tx('Choose a Pupbox plan for your dog — 1, 3, 6 or 12 months. Longer plans save more.', 'აირჩიე Pupbox-ის გეგმა შენი ძაღლისთვის — 1, 3, 6 ან 12 თვით. გრძელვადიანი გეგმები უფრო ხელსაყრელია.'),
    ),
  ],
};
