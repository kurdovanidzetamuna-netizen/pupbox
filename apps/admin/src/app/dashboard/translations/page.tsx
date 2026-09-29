'use client';
import { useEffect, useState } from 'react';
import { ActionButton, RowActions } from '../../../components/Toolbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function exportCsv(rows: string[][], filename: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = rows.map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const PAGES = [
  { key: 'homepage',     label: 'Home Page',           icon: '🏠' },
  { key: 'pricing',      label: 'Pricing Page',         icon: '💳' },
  { key: 'how-it-works', label: 'How It Works',         icon: '⚙️' },
  { key: 'blog',         label: 'Blog',                 icon: '✍️' },
  { key: 'terms',        label: 'Terms & Conditions',   icon: '📋' },
  { key: 'privacy',      label: 'Privacy Policy',       icon: '🔒' },
  { key: 'contact',      label: 'Contact',              icon: '📬' },
  { key: 'global',       label: 'Global / Shared',      icon: '🌐' },
];

interface Translation {
  id: string;
  key: string;
  en: string;
  ka: string;
  pages: string[];
}

const EMPTY_FORM: Omit<Translation, 'id'> = { key: '', en: '', ka: '', pages: [] };

function genId() { return Math.random().toString(36).slice(2, 10); }

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED: Omit<Translation, 'id'>[] = [
  // ── Homepage · Hero ──────────────────────────────────────────────────────
  { key: 'hero.badge',            en: '🐶 Monthly Dog Subscription Boxes · Georgia', ka: '🐶 ყოველთვიური კუთხის გამოწერა · საქართველო', pages: ['homepage'] },
  { key: 'hero.heading',          en: 'Your dog deserves a surprise every month',    ka: 'შენი ძაღლი იმსახურებს სიურპრიზს ყოველ თვე', pages: ['homepage'] },
  { key: 'hero.headingAccent',    en: 'a surprise every month',                      ka: 'სიურპრიზს ყოველ თვე', pages: ['homepage'] },
  { key: 'hero.description',      en: 'Curated boxes of premium treats, toys and accessories — tailored to your dog\'s size and breed. Delivered across Georgia.', ka: 'პრემიუმ საჭმლის, სათამაშოებისა და აქსესუარების კურირებული კოლოფი — მორგებული შენი ძაღლის ზომასა და ჯიშზე. მიწოდება მთელ საქართველოში.', pages: ['homepage'] },
  { key: 'hero.cta1',             en: 'Start Your Subscription →',                   ka: 'გამოწერის დაწყება →', pages: ['homepage', 'pricing'] },
  { key: 'hero.cta2',             en: '🎁 Give as a Gift',                           ka: '🎁 საჩუქრად გადაცემა', pages: ['homepage', 'pricing'] },
  { key: 'hero.cta3',             en: 'See How It Works',                            ka: 'როგორ მუშაობს', pages: ['homepage'] },
  { key: 'hero.step1',            en: 'Sign Up',                                     ka: 'რეგისტრაცია', pages: ['homepage'] },
  { key: 'hero.step2',            en: 'Set Up Dog',                                  ka: 'ძაღლის დამატება', pages: ['homepage'] },
  { key: 'hero.step3',            en: 'Choose Plan',                                 ka: 'გეგმის არჩევა', pages: ['homepage'] },
  { key: 'hero.step4',            en: 'Get Delivered',                               ka: 'მიწოდება', pages: ['homepage'] },
  { key: 'hero.cancelNote',       en: '✅ Cancel or pause anytime',                  ka: '✅ გაუქმება ან პაუზა ნებისმიერ დროს', pages: ['homepage'] },

  // ── Homepage · Stats ─────────────────────────────────────────────────────
  { key: 'stats.happyDogs',       en: 'Happy dogs',       ka: 'ბედნიერი ძაღლი',      pages: ['homepage'] },
  { key: 'stats.avgRating',       en: 'Average rating',   ka: 'საშუალო შეფასება',    pages: ['homepage'] },
  { key: 'stats.productsPerBox',  en: 'Products per box', ka: 'პროდუქტი კოლოფში',    pages: ['homepage'] },

  // ── Homepage · What's in the Box ─────────────────────────────────────────
  { key: 'box.heading',           en: "What's inside every box?", ka: 'რა არის ყოველ კოლოფში?', pages: ['homepage'] },
  { key: 'box.description',       en: "Every box is handpicked by our team and personalised to your dog's size and preferences.", ka: 'ყოველი კოლოფი ხელით შეირჩევა ჩვენი გუნდის მიერ და მორგებულია შენი ძაღლის ზომასა და პრეფერენციებზე.', pages: ['homepage'] },
  { key: 'box.item1.title',       en: 'Premium Treats',          ka: 'პრემიუმ საჭმელი', pages: ['homepage'] },
  { key: 'box.item1.desc',        en: "Locally sourced and imported treats chosen for your dog's size and dietary needs.", ka: 'ადგილობრივი და იმპორტირებული საჭმელი, შერჩეული შენი ძაღლის ზომისა და კვებითი საჭიროებების მიხედვით.', pages: ['homepage'] },
  { key: 'box.item2.title',       en: 'Fun Toys',                ka: 'სახალისო სათამაშოები', pages: ['homepage'] },
  { key: 'box.item2.desc',        en: 'Durable, vet-approved toys to keep your pup entertained and mentally stimulated.', ka: 'გამძლე, ვეტერინარის მიერ დამტკიცებული სათამაშოები, რომელიც შენს ლეკვს გართობს და გონებრივად ააქტიურებს.', pages: ['homepage'] },
  { key: 'box.item3.title',       en: 'Grooming & Accessories',  ka: 'მოვლა და აქსესუარები', pages: ['homepage'] },
  { key: 'box.item3.desc',        en: 'Quality grooming products, bandanas, collars and more — all selected for your breed.', ka: 'ხარისხიანი მოვლის პროდუქტები, ბანდანები, საყელოები და სხვა — ყველაფერი შერჩეული შენი ჯიშისთვის.', pages: ['homepage'] },
  { key: 'box.item4.title',       en: 'Surprise Item',           ka: 'სიურპრიზი', pages: ['homepage'] },
  { key: 'box.item4.desc',        en: 'Every box includes at least one exclusive surprise product your dog will love.', ka: 'ყოველ კოლოფში მინიმუმ ერთი ექსკლუზიური სიურპრიზი, რომელიც შენს ძაღლს მოეწონება.', pages: ['homepage'] },
  { key: 'box.item5.title',       en: 'Breed-Specific Selection', ka: 'ჯიშზე მორგებული შერჩევა', pages: ['homepage'] },
  { key: 'box.item5.desc',        en: "Tell us your dog's breed and we'll tailor the products to their specific needs.", ka: 'გვიამბე შენი ძაღლის ჯიშის შესახებ და ჩვენ პროდუქტებს მის საჭიროებებზე მოვარგებთ.', pages: ['homepage'] },
  { key: 'box.item6.title',       en: '5–8 Full-Size Products',  ka: '5–8 სრული ზომის პროდუქტი', pages: ['homepage'] },
  { key: 'box.item6.desc',        en: 'No sample packets — only full-size premium products worth more than your subscription price.', ka: 'არანაირი ნიმუშები — მხოლოდ სრული ზომის პრემიუმ პროდუქტები, რომელთა ღირებულება გამოწერის ფასზე მეტია.', pages: ['homepage'] },

  // ── Homepage · How It Works ──────────────────────────────────────────────
  { key: 'hiw.heading',           en: 'How Pupbox works',      ka: 'Pupbox-ი როგორ მუშაობს', pages: ['homepage', 'how-it-works'] },
  { key: 'hiw.subheading',        en: 'Get started in minutes. Your first box ships within 3–5 business days.', ka: 'დაიწყე წუთებში. პირველი კოლოფი გამოიგზავნება 3–5 სამუშაო დღეში.', pages: ['homepage'] },
  { key: 'hiw.step1.title',       en: 'Choose a plan',         ka: 'აირჩიე გეგმა', pages: ['homepage'] },
  { key: 'hiw.step1.desc',        en: 'Pick monthly, 3-month, 6-month or annual. Longer plans save more.', ka: 'აირჩიე ყოველთვიური, 3-თვიანი, 6-თვიანი ან წლიური. გრძელვადიანი გეგმები უფრო ხელსაყრელია.', pages: ['homepage'] },
  { key: 'hiw.step2.title',       en: 'Tell us about your dog', ka: 'გვიამბე ძაღლის შესახებ', pages: ['homepage'] },
  { key: 'hiw.step2.desc',        en: 'Size, breed, preferences — we personalise every single box.', ka: 'ზომა, ჯიში, პრეფერენციები — ჩვენ ყოველ კოლოფს პირადად მოვარგებთ.', pages: ['homepage'] },
  { key: 'hiw.step3.title',       en: 'We pack your box',      ka: 'ვაწყობთ კოლოფს', pages: ['homepage'] },
  { key: 'hiw.step3.desc',        en: 'Our team handpicks 5–8 products perfectly suited for your pup.', ka: 'ჩვენი გუნდი ხელით ირჩევს 5–8 პროდუქტს შენი ლეკვისთვის.', pages: ['homepage'] },
  { key: 'hiw.step4.title',       en: 'Enjoy & repeat',        ka: 'ისიამოვნე და გაიმეორე', pages: ['homepage'] },
  { key: 'hiw.step4.desc',        en: 'A fresh surprise arrives every month. Cancel or pause anytime.', ka: 'ახალი სიურპრიზი ყოველ თვე. გაუქმება ან პაუზა — ნებისმიერ დროს.', pages: ['homepage'] },

  // ── Homepage · Plans ─────────────────────────────────────────────────────
  { key: 'plans.heading',         en: 'Simple, transparent pricing', ka: 'მარტივი, გამჭვირვალე ფასები', pages: ['homepage', 'pricing'] },
  { key: 'plans.subheading',      en: 'Longer plans save more. All prices in Georgian Lari (₾).', ka: 'გრძელვადიანი გეგმები უფრო ხელსაყრელია. ყველა ფასი ქართულ ლარში (₾).', pages: ['homepage', 'pricing'] },
  { key: 'plans.benefit1.title',  en: 'Free delivery',         ka: 'უფასო მიწოდება', pages: ['homepage', 'pricing', 'global'] },
  { key: 'plans.benefit1.desc',   en: 'All subscription boxes include free delivery across Georgia.', ka: 'ყველა გამოწერის კოლოფი მოიცავს უფასო მიწოდებას მთელ საქართველოში.', pages: ['homepage'] },
  { key: 'plans.benefit2.title',  en: 'Cancel anytime',        ka: 'გაუქმება ნებისმიერ დროს', pages: ['homepage', 'pricing', 'global'] },
  { key: 'plans.benefit2.desc',   en: 'No contracts. Pause or cancel your subscription whenever you want.', ka: 'ხელშეკრულება არ არის. შეაჩერე ან გააუქმე გამოწერა ნებისმიერ დროს.', pages: ['homepage'] },
  { key: 'plans.benefit3.title',  en: 'Customer support',      ka: 'მომხმარებლის მხარდაჭერა', pages: ['homepage', 'pricing', 'global'] },
  { key: 'plans.benefit3.desc',   en: 'Our team is here to help with any questions about your order.', ka: 'ჩვენი გუნდი მზადაა დაგეხმარო ნებისმიერ კითხვაში შენი შეკვეთის შესახებ.', pages: ['homepage'] },

  // ── Homepage · Testimonials ──────────────────────────────────────────────
  { key: 'testimonials.heading',    en: 'Dogs (and owners) love Pupbox',              ka: 'ძაღლები (და მათი პატრონები) უყვართ Pupbox-ს', pages: ['homepage'] },
  { key: 'testimonials.subheading', en: 'Join hundreds of happy Pupbox families across Georgia.', ka: 'შეუერთდი ასობით ბედნიერ Pupbox ოჯახს საქართველოში.', pages: ['homepage'] },
  { key: 'testimonials.t1.quote',   en: 'My dog Max goes crazy when the box arrives! The treats are excellent quality and everything is perfectly sized for a large dog.', ka: 'ჩემი ძაღლი მაქსი გიჟდება, როდესაც კოლოფი ჩამოდის! საჭმლის ხარისხი შესანიშნავია და ყველაფერი სწორი ზომისაა მსხვილი ძაღლისთვის.', pages: ['homepage'] },
  { key: 'testimonials.t2.quote',   en: 'Worth every lari. The personalisation is real — every box has exactly the right products for a small dog. Amazing service!', ka: 'ყოველი ლარი ღირს. პერსონალიზაცია რეალურია — ყოველ კოლოფში ზუსტად სწორი პროდუქტებია პატარა ძაღლისთვის. მშვენიერი სერვისი!', pages: ['homepage'] },
  { key: 'testimonials.t3.quote',   en: "We've been subscribers for 6 months and every box feels like a gift. The bonus surprise items always make my dog's day!", ka: '6 თვეა ვიყენებთ და ყოველი კოლოფი საჩუქრად გვეჩვენება. ბონუს სიურპრიზები ყოველთვის ახარებს ჩემს ძაღლს!', pages: ['homepage'] },

  // ── Homepage · FAQ ───────────────────────────────────────────────────────
  { key: 'faq.heading', en: 'Frequently asked questions', ka: 'ხშირად დასმული კითხვები', pages: ['homepage', 'how-it-works'] },
  { key: 'faq.q1', en: 'When will my first box arrive?',                    ka: 'როდის ჩამოვა პირველი კოლოფი?', pages: ['homepage', 'pricing'] },
  { key: 'faq.a1', en: 'Your first box ships within 3–5 business days after your subscription is confirmed. Delivery across Georgia typically takes 1–3 additional days.', ka: 'პირველი კოლოფი გამოიგზავნება გამოწერის დადასტურებიდან 3–5 სამუშაო დღეში. მიწოდება მთელ საქართველოში ჩვეულებრივ კიდევ 1–3 დღეს ითვალისწინებს.', pages: ['homepage', 'pricing'] },
  { key: 'faq.q2', en: 'Can I customise the box for my dog?',               ka: 'შეიძლება კოლოფის კუსტომიზაცია?', pages: ['homepage', 'pricing'] },
  { key: 'faq.a2', en: "Yes! When you sign up, you tell us your dog's name, breed, size and preferences. We use this information to personalise every single box.", ka: 'დიახ! რეგისტრაციისას გვეუბნები ძაღლის სახელს, ჯიშს, ზომასა და პრეფერენციებს. ამ ინფორმაციით ყოველ კოლოფს პირადად ვარგებთ.', pages: ['homepage', 'pricing'] },
  { key: 'faq.q3', en: 'Can I pause or cancel my subscription?',            ka: 'შეიძლება გამოწერის შეჩერება ან გაუქმება?', pages: ['homepage', 'pricing', 'how-it-works'] },
  { key: 'faq.a3', en: 'Absolutely. You can pause or cancel your subscription at any time from your account dashboard, with no questions asked and no cancellation fees.', ka: 'რა თქმა უნდა. გამოწერა შეგიძლია შეაჩერო ან გააუქმო ნებისმიერ დროს პირადი კაბინეტიდან, კითხვებისა და გაუქმების გადასახადის გარეშე.', pages: ['homepage', 'pricing', 'how-it-works'] },
  { key: 'faq.q4', en: "What if my dog doesn't like something in the box?", ka: 'რა მოხდება, თუ კოლოფში რაღაც არ მოეწონება?', pages: ['homepage', 'pricing'] },
  { key: 'faq.a4', en: "Contact our support team and we'll replace the item or apply a credit to your next box. Your dog's happiness is our priority.", ka: 'დაუკავშირდი ჩვენს გუნდს და ჩვენ ჩავანაცვლებთ ან კრედიტს ჩაგითვლით შემდეგ კოლოფში. შენი ძაღლის ბედნიერება ჩვენი პრიორიტეტია.', pages: ['homepage', 'pricing'] },
  { key: 'faq.q5', en: 'Do you deliver outside Tbilisi?',                   ka: 'მიატანთ თბილისის გარეთ?', pages: ['homepage', 'pricing', 'how-it-works'] },
  { key: 'faq.a5', en: 'Yes! We deliver to all major cities and most regions across Georgia, including Tbilisi, Batumi, Kutaisi, Rustavi, and more.', ka: 'დიახ! ვაწვდით საქართველოს ყველა მთავარ ქალაქსა და რეგიონში, მათ შორის თბილისს, ბათუმს, ქუთაისს, რუსთავს და სხვებს.', pages: ['homepage', 'pricing', 'how-it-works'] },
  { key: 'faq.q6', en: 'When will my box arrive?',                          ka: 'როდის ჩამოვა კოლოფი?', pages: ['how-it-works'] },
  { key: 'faq.a6', en: 'Boxes ship on the 1st of each month. Standard delivery takes 2–3 business days, express next day.', ka: 'კოლოფები ყოველი თვის 1-ლ რიცხვს გამოიგზავნება. სტანდარტული მიწოდება 2–3 სამუშაო დღეს, ექსპრესი — მეორე დღეს.', pages: ['how-it-works'] },
  { key: 'faq.q7', en: 'Can I skip or pause my subscription?',              ka: 'შეიძლება გამოწერის გამოტოვება ან შეჩერება?', pages: ['how-it-works'] },
  { key: 'faq.a7', en: 'Yes — you can pause for up to 2 months or cancel anytime from your account dashboard.', ka: 'დიახ — შეგიძლია 2 თვემდე შეაჩერო ან ნებისმიერ დროს გააუქმო პირადი კაბინეტიდან.', pages: ['how-it-works'] },
  { key: 'faq.q8', en: "What if my dog doesn't like something?",            ka: 'რა მოხდება, თუ ძაღლს რაღაც არ მოეწონება?', pages: ['how-it-works'] },
  { key: 'faq.a8', en: "We offer a satisfaction guarantee. Contact our team and we'll make it right.", ka: 'ჩვენ კმაყოფილების გარანტიას გთავაზობთ. დაუკავშირდი ჩვენს გუნდს და გამოვასწორებთ.', pages: ['how-it-works'] },
  { key: 'faq.q9', en: 'Is there a free trial?',                            ka: 'არის უფასო საცდელი პერიოდი?', pages: ['how-it-works'] },
  { key: 'faq.a9', en: "We don't offer free trials, but the monthly plan is commitment-free — cancel anytime.", ka: 'უფასო საცდელს არ ვთავაზობთ, მაგრამ ყოველთვიური გეგმა ვალდებულებას არ ითვალისწინებს — გაუქმება ნებისმიერ დროს.', pages: ['how-it-works'] },

  // ── Homepage · CTA ───────────────────────────────────────────────────────
  { key: 'cta.heading',       en: "Make your dog's month, every month.", ka: 'გაახარე შენი ძაღლი, ყოველ თვე.', pages: ['homepage'] },
  { key: 'cta.headingAccent', en: 'every month.',                         ka: 'ყოველ თვე.',                     pages: ['homepage'] },
  { key: 'cta.description',   en: 'Join hundreds of Georgian dog owners who already trust Pupbox. First box ships in 3–5 days.', ka: 'შეუერთდი ასობით ქართველ ძაღლის პატრონს, ვინც უკვე ენდობა Pupbox-ს. პირველი კოლოფი 3–5 დღეში.', pages: ['homepage'] },
  { key: 'cta.socialProof',   en: '500+ happy pups in Georgia',           ka: '500+ ბედნიერი ლეკვი საქართველოში', pages: ['homepage'] },
  { key: 'cta.trustChip1',    en: '✅ Cancel anytime',                    ka: '✅ გაუქმება ნებისმიერ დროს',     pages: ['homepage', 'global'] },
  { key: 'cta.trustChip2',    en: '🚚 Free delivery',                     ka: '🚚 უფასო მიწოდება',              pages: ['homepage', 'global'] },
  { key: 'cta.trustChip3',    en: '🎁 Personalised boxes',                ka: '🎁 პერსონალიზებული კოლოფები',    pages: ['homepage', 'global'] },
  { key: 'cta.trustChip4',    en: '⭐ 4.9 rating',                        ka: '⭐ 4.9 შეფასება',                 pages: ['homepage', 'global'] },
  { key: 'cta.btn1',          en: 'Start Your Subscription →',            ka: 'გამოწერის დაწყება →',             pages: ['homepage', 'global'] },
  { key: 'cta.btn2',          en: 'Compare Plans',                         ka: 'გეგმების შედარება',              pages: ['homepage'] },

  // ── Pricing Page ─────────────────────────────────────────────────────────
  { key: 'pricing.hero.heading',       en: 'Simple, transparent pricing',    ka: 'მარტივი, გამჭვირვალე ფასები', pages: ['pricing'] },
  { key: 'pricing.hero.sub',           en: 'Choose a plan that works best for you and your dog. Cancel anytime.', ka: 'აირჩიე გეგმა, რომელიც შენთვის და შენი ძაღლისთვის ყველაზე კარგია. გაუქმება ნებისმიერ დროს.', pages: ['pricing'] },
  { key: 'pricing.includes.heading',   en: 'Every plan includes',            ka: 'ყველა გეგმა მოიცავს', pages: ['pricing'] },
  { key: 'pricing.includes.i1',        en: "📦 Handpicked products for your dog's size and breed", ka: '📦 ხელით შერჩეული პროდუქტები შენი ძაღლის ზომისა და ჯიშისთვის', pages: ['pricing'] },
  { key: 'pricing.includes.i2',        en: '🚚 Free delivery on all subscription boxes', ka: '🚚 უფასო მიწოდება ყველა გამოწერის კოლოფზე', pages: ['pricing'] },
  { key: 'pricing.includes.i3',        en: "🐾 Personalised to your dog's preferences", ka: '🐾 მორგებული შენი ძაღლის პრეფერენციებზე', pages: ['pricing'] },
  { key: 'pricing.includes.i4',        en: '💬 Dedicated customer support',  ka: '💬 მომხმარებელთა სპეციალური მხარდაჭერა', pages: ['pricing'] },
  { key: 'pricing.includes.i5',        en: '🔄 Flexible cancel or pause options', ka: '🔄 მოქნილი გაუქმება ან პაუზის ვარიანტი', pages: ['pricing'] },
  { key: 'pricing.includes.i6',        en: '🎁 Surprise bonus items in selected plans', ka: '🎁 სიურპრიზ ბონუს ნივთები გარკვეულ გეგმებში', pages: ['pricing'] },
  { key: 'pricing.toggle.myDog',       en: '🐾 For My Dog',                  ka: '🐾 ჩემი ძაღლისთვის', pages: ['pricing'] },
  { key: 'pricing.toggle.gift',        en: '🎁 Give as a Gift',               ka: '🎁 საჩუქრად', pages: ['pricing'] },
  { key: 'pricing.gift.banner',        en: "You'll be able to enter the recipient's details and a personalised message at checkout. We'll send them a beautiful digital gift card with all the details.", ka: 'შეძლებ შეიყვანო მიმღების მონაცემები და პერსონალური შეტყობინება გამოწერის დადასტურებისას. ჩვენ გამოვუგზავნით მათ ლამაზ ციფრულ საჩუქრის ბარათს.', pages: ['pricing'] },
  { key: 'pricing.planCard.popular',   en: '⭐ Most Popular',                ka: '⭐ ყველაზე პოპულარული', pages: ['pricing', 'global'] },
  { key: 'pricing.planCard.bestValue', en: '🏆 Best Value',                  ka: '🏆 საუკეთესო ღირებულება', pages: ['pricing', 'global'] },
  { key: 'pricing.planCard.gift',      en: '🎁 Great Gift',                  ka: '🎁 შესანიშნავი საჩუქარი', pages: ['pricing', 'global'] },
  { key: 'pricing.planCard.cta',       en: 'Get Started →',                  ka: 'დაწყება →', pages: ['pricing', 'global'] },
  { key: 'pricing.planCard.giftCta',   en: '🎁 Gift This Plan →',            ka: '🎁 საჩუქრად გადაცემა →', pages: ['pricing', 'global'] },
  { key: 'pricing.planCard.freeDelivery', en: '✓ Free delivery',             ka: '✓ უფასო მიწოდება', pages: ['pricing', 'global'] },

  // ── How It Works Page ────────────────────────────────────────────────────
  { key: 'hiw.page.badge',         en: '🐾 Simple 5-step journey',           ka: '🐾 მარტივი 5-საფეხურიანი გზა', pages: ['how-it-works'] },
  { key: 'hiw.page.heading',       en: 'From Click to',                      ka: 'დაწკაპუნებიდან', pages: ['how-it-works'] },
  { key: 'hiw.page.headingAccent', en: 'Happy Pup',                          ka: 'ბედნიერ ლეკვამდე', pages: ['how-it-works'] },
  { key: 'hiw.page.description',   en: 'A curated monthly box of treats, toys, and accessories. Simple, fun, and completely personalised.', ka: 'კურირებული ყოველთვიური კოლოფი საჭმლით, სათამაშოებითა და აქსესუარებით. მარტივი, სახალისო და სრულიად პერსონალიზებული.', pages: ['how-it-works'] },
  { key: 'hiw.page.step1.title',   en: 'Choose Your Plan',                   ka: 'აირჩიე გეგმა', pages: ['how-it-works'] },
  { key: 'hiw.page.step1.desc',    en: 'Pick monthly, 3-month, 6-month, or annual. The longer you commit, the more you save.', ka: 'აირჩიე ყოველთვიური, 3-თვიანი, 6-თვიანი ან წლიური. რაც უფრო გრძელია, მით უფრო ხელსაყრელია.', pages: ['how-it-works'] },
  { key: 'hiw.page.step2.title',   en: 'Tell Us About Your Dog',             ka: 'გვიამბე ძაღლის შესახებ', pages: ['how-it-works'] },
  { key: 'hiw.page.step2.desc',    en: "Share your dog's name, breed, size, and dietary needs so we can personalise every single box.", ka: 'გაგვიზიარე ძაღლის სახელი, ჯიში, ზომა და კვებითი მოთხოვნები, რომ ყოველ კოლოფს პირადად მოვარგოთ.', pages: ['how-it-works'] },
  { key: 'hiw.page.step3.title',   en: 'We Curate Your Box',                 ka: 'ვაკომპლექტებთ კოლოფს', pages: ['how-it-works'] },
  { key: 'hiw.page.step3.desc',    en: 'Our team handpicks premium treats, toys, and accessories tailored perfectly to your pup.', ka: 'ჩვენი გუნდი ხელით ირჩევს პრემიუმ საჭმელს, სათამაშოებსა და აქსესუარებს — ზუსტად შენი ლეკვისთვის.', pages: ['how-it-works'] },
  { key: 'hiw.page.step4.title',   en: 'Delivered to Your Door',             ka: 'მიწოდება კართან', pages: ['how-it-works'] },
  { key: 'hiw.page.step4.desc',    en: 'Your box ships across all of Georgia — standard or express, you choose.', ka: 'კოლოფი გამოიგზავნება მთელ საქართველოში — სტანდარტული ან ექსპრესი, შენი არჩევანია.', pages: ['how-it-works'] },
  { key: 'hiw.page.step5.title',   en: 'Your Dog Goes Wild',                 ka: 'ძაღლი ბედნიერია', pages: ['how-it-works'] },
  { key: 'hiw.page.step5.desc',    en: 'Watch your pup unbox their surprise. Share the joy and earn rewards by referring friends!', ka: 'უყურე ლეკვს, როგორ ხსნის სიურპრიზს. გაუზიარე სიხარული და მიიღე ჯილდო მეგობრების მოყვანით!', pages: ['how-it-works'] },
  { key: 'hiw.page.faq.heading',   en: 'Got questions?',                     ka: 'გაქვთ კითხვები?', pages: ['how-it-works'] },
  { key: 'hiw.page.faq.sub',       en: 'Everything you need to know before your first box.', ka: 'ყველაფერი, რაც უნდა იცოდე პირველი კოლოფამდე.', pages: ['how-it-works'] },
  { key: 'hiw.page.cta.heading',   en: 'Your dog deserves a surprise every month', ka: 'შენი ძაღლი იმსახურებს სიურპრიზს ყოველ თვე', pages: ['how-it-works'] },
  { key: 'hiw.page.cta.desc',      en: 'Curated treats, toys & accessories — tailored to your pup. From ₾49. Cancel anytime.', ka: 'კურირებული საჭმელი, სათამაშოები და აქსესუარები — მორგებული შენი ლეკვისთვის. ₾49-დან. გაუქმება ნებისმიერ დროს.', pages: ['how-it-works'] },
  { key: 'hiw.page.cta.btn1',      en: 'Get Started →',                      ka: 'დაწყება →', pages: ['how-it-works'] },
  { key: 'hiw.page.cta.btn2',      en: 'View Pricing',                       ka: 'ფასების ნახვა', pages: ['how-it-works'] },

  // ── Blog Page ────────────────────────────────────────────────────────────
  { key: 'blog.badge',       en: '🐶 Dog Care Blog',                         ka: '🐶 ძაღლის მოვლის ბლოგი', pages: ['blog'] },
  { key: 'blog.heading',     en: 'Tips, Guides & Dog Advice',                ka: 'რჩევები, გიდები და ძაღლის შესახებ', pages: ['blog'] },
  { key: 'blog.description', en: 'Expert breed guides, training tips, health insights, and more — from the Pupbox team.', ka: 'ჯიშის გიდები, ვარჯიშის რჩევები, ჯანმრთელობის ინფორმაცია და სხვა — Pupbox-ის გუნდისგან.', pages: ['blog'] },
  { key: 'blog.empty',       en: 'No posts yet',                             ka: 'სტატიები ჯერ არ არის', pages: ['blog'] },
  { key: 'blog.empty.desc',  en: 'Our team is working on expert dog care content. Check back soon!', ka: 'ჩვენი გუნდი მუშაობს ძაღლის მოვლის ექსპერტულ კონტენტზე. მალე შეამოწმე!', pages: ['blog'] },
  { key: 'blog.cta.heading', en: 'Spoil your dog every month',               ka: 'გაახარე შენი ძაღლი ყოველ თვე', pages: ['blog'] },
  { key: 'blog.cta.desc',    en: 'Curated boxes of treats, toys & accessories.', ka: 'კურირებული კოლოფები საჭმლით, სათამაშოებითა და აქსესუარებით.', pages: ['blog'] },
  { key: 'blog.cta.btn',     en: 'Subscribe Now',                            ka: 'გამოწერა', pages: ['blog'] },
  { key: 'blog.readMore',    en: 'Read →',                                   ka: 'წაკითხვა →', pages: ['blog'] },
  { key: 'blog.categories',  en: 'Categories',                               ka: 'კატეგორიები', pages: ['blog'] },
  { key: 'blog.allPosts',    en: 'All posts',                                ka: 'ყველა სტატია', pages: ['blog'] },

  // ── Auth Pages ───────────────────────────────────────────────────────────
  { key: 'login.heading',         en: 'Sign in to your account',             ka: 'ანგარიშში შესვლა', pages: ['global'] },
  { key: 'login.email',           en: 'Email',                               ka: 'ელ-ფოსტა', pages: ['global'] },
  { key: 'login.password',        en: 'Password',                            ka: 'პაროლი', pages: ['global'] },
  { key: 'login.btn',             en: 'Sign In',                             ka: 'შესვლა', pages: ['global'] },
  { key: 'login.noAccount',       en: "Don't have an account?",              ka: 'ანგარიში არ გაქვს?', pages: ['global'] },
  { key: 'login.createOne',       en: 'Create one',                          ka: 'შექმენი', pages: ['global'] },
  { key: 'register.heading',      en: 'Create your account',                 ka: 'ანგარიშის შექმნა', pages: ['global'] },
  { key: 'register.subheading',   en: 'Join thousands of happy dogs across Georgia 🐾', ka: 'შეუერთდი ათასობით ბედნიერ ძაღლს საქართველოში 🐾', pages: ['global'] },
  { key: 'register.firstName',    en: 'First name',                          ka: 'სახელი', pages: ['global'] },
  { key: 'register.lastName',     en: 'Last name',                           ka: 'გვარი', pages: ['global'] },
  { key: 'register.phone',        en: 'Phone (optional)',                    ka: 'ტელეფონი (სურვილისამებრ)', pages: ['global'] },
  { key: 'register.referral',     en: 'Referral code (optional)',            ka: 'რეფერალური კოდი (სურვილისამებრ)', pages: ['global'] },
  { key: 'register.btn',          en: 'Create Account',                      ka: 'ანგარიშის შექმნა', pages: ['global'] },
  { key: 'register.haveAccount',  en: 'Already have an account?',            ka: 'უკვე გაქვს ანგარიში?', pages: ['global'] },
  { key: 'register.signIn',       en: 'Sign in',                             ka: 'შესვლა', pages: ['global'] },

  // ── Navigation / Header ──────────────────────────────────────────────────
  { key: 'nav.howItWorks', en: 'How it Works', ka: 'როგორ მუშაობს', pages: ['global'] },
  { key: 'nav.pricing',    en: 'Pricing',       ka: 'ფასები',         pages: ['global'] },
  { key: 'nav.shop',       en: 'Shop',          ka: 'მაღაზია',        pages: ['global'] },
  { key: 'nav.blog',       en: 'Blog',          ka: 'ბლოგი',          pages: ['global'] },
  { key: 'nav.signIn',     en: 'Sign In',       ka: 'შესვლა',         pages: ['global'] },
  { key: 'nav.subscribe',  en: 'Subscribe',     ka: 'გამოწერა',       pages: ['global'] },

  // ── Footer ───────────────────────────────────────────────────────────────
  { key: 'footer.tagline',   en: 'Monthly curated subscription boxes for your dog. Delivered across Georgia with love.', ka: 'ყოველთვიური კურირებული კოლოფები შენი ძაღლისთვის. მიწოდება მთელ საქართველოში სიყვარულით.', pages: ['global'] },
  { key: 'footer.company',   en: 'Company',                              ka: 'კომპანია',                          pages: ['global'] },
  { key: 'footer.account',   en: 'Account',                              ka: 'ანგარიში',                          pages: ['global'] },
  { key: 'footer.myOrders',  en: 'My orders',                            ka: 'ჩემი შეკვეთები',                    pages: ['global'] },
  { key: 'footer.copyright', en: 'All rights reserved. Made with 🐾 in Georgia.', ka: 'ყველა უფლება დაცულია. შექმნილია 🐾 საქართველოში.', pages: ['global'] },
  { key: 'footer.privacy',   en: 'Privacy Policy',                       ka: 'კონფიდენციალობის პოლიტიკა',        pages: ['global'] },
  { key: 'footer.terms',     en: 'Terms of Service',                     ka: 'მომსახურების პირობები',             pages: ['global'] },

  // ── Box Contents ─────────────────────────────────────────────────────────
  { key: 'boxContents.heading',          en: '📦 Inside every box',   ka: '📦 ყოველ კოლოფში', pages: ['pricing'] },
  { key: 'boxContents.sub',             en: 'What your pup gets each month', ka: 'რას იღებს შენი ლეკვი ყოველ თვე', pages: ['pricing'] },
  { key: 'boxContents.note',            en: 'Exact items vary by plan, dog size, and season. All products are vet-reviewed and pet-safe.', ka: 'კონკრეტული ნივთები განსხვავდება გეგმის, ძაღლის ზომისა და სეზონის მიხედვით. ყველა პროდუქტი ვეტერინარის მიერ შემოწმებულია.', pages: ['pricing'] },
  { key: 'boxContents.tab.treats',      en: '🦴 Treats',              ka: '🦴 საჭმელი',        pages: ['pricing'] },
  { key: 'boxContents.tab.toys',        en: '🧸 Toys',                ka: '🧸 სათამაშოები',    pages: ['pricing'] },
  { key: 'boxContents.tab.grooming',    en: '✨ Grooming',             ka: '✨ მოვლა',           pages: ['pricing'] },
  { key: 'boxContents.tab.accessories', en: '🎀 Accessories',         ka: '🎀 აქსესუარები',    pages: ['pricing'] },
  { key: 'boxContents.tab.surprise',    en: '🎁 Surprise',            ka: '🎁 სიურპრიზი',      pages: ['pricing'] },

  // ── Global / Shared ──────────────────────────────────────────────────────
  { key: 'global.backToHome',    en: 'Back to homepage',  ka: 'მთავარ გვერდზე დაბრუნება',          pages: ['global'] },
  { key: 'global.loading',       en: 'Loading…',          ka: 'იტვირთება…',                        pages: ['global'] },
  { key: 'global.save',          en: 'Save',              ka: 'შენახვა',                           pages: ['global'] },
  { key: 'global.cancel',        en: 'Cancel',            ka: 'გაუქმება',                          pages: ['global'] },
  { key: 'global.continue',      en: 'Continue',          ka: 'გაგრძელება',                        pages: ['global'] },
  { key: 'global.freeDelivery',  en: 'Free delivery',     ka: 'უფასო მიწოდება',                    pages: ['global'] },
  { key: 'global.cancelAnytime', en: 'Cancel anytime',    ka: 'გაუქმება ნებისმიერ დროს',           pages: ['global'] },
  { key: 'global.perMonth',      en: '/month',            ka: '/თვეში',                            pages: ['global'] },
  { key: 'global.savePercent',   en: 'Save',              ka: 'დაზოგე',                            pages: ['global'] },
  { key: 'global.vsMonthly',     en: 'vs monthly',        ka: 'ყოველთვიურთან შედარებით',           pages: ['global'] },
  { key: 'global.georgia',       en: 'Georgia',           ka: 'საქართველო',                        pages: ['global'] },
  { key: 'global.tbilisi',       en: 'Tbilisi',           ka: 'თბილისი',                           pages: ['global'] },
];

// ── Controlled inline-edit row ──────────────────────────────────────────────
function TranslationRow({ s, onSave, onEdit, onDelete }: {
  s: Translation;
  onSave: (id: string, en: string, ka: string) => void;
  onEdit: (s: Translation) => void;
  onDelete: (id: string) => void;
}) {
  const [en, setEn] = useState(s.en);
  const [ka, setKa] = useState(s.ka);
  const [focused, setFocused] = useState(false);

  useEffect(() => { setEn(s.en); }, [s.en]);
  useEffect(() => { setKa(s.ka); }, [s.ka]);

  const dirty = en !== s.en || ka !== s.ka;
  const showSave = dirty || focused;
  const canSave = en.trim() !== '' && ka.trim() !== '';
  const missingKa = !s.ka.trim();

  const taStyle = (missing: boolean): React.CSSProperties => ({
    width: '100%', padding: '5px 9px', fontSize: 13,
    border: `1px solid ${missing ? 'var(--amber-200)' : 'var(--slate-200)'}`, borderRadius: 7,
    outline: 'none', background: missing ? 'var(--amber-50)' : 'var(--slate-50)',
    color: 'var(--slate-900)', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit',
  });

  return (
    <tr style={{ borderBottom: '1px solid var(--slate-100)', background: missingKa ? 'var(--amber-50b)' : 'transparent' }}>
      <td style={{ padding: '10px 16px', maxWidth: 160, verticalAlign: 'top' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '2px 7px', borderRadius: 5, wordBreak: 'break-all', display: 'inline-block' }}>{s.key}</span>
        {missingKa && <span style={{ display: 'block', fontSize: 10, color: 'var(--amber-500)', fontWeight: 700, marginTop: 3 }}>⚠ Missing KA</span>}
      </td>
      <td style={{ padding: '6px 16px', minWidth: 200, verticalAlign: 'top' }}>
        <textarea value={en} onChange={e => setEn(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="English text…" rows={2} style={taStyle(false)} />
      </td>
      <td style={{ padding: '6px 16px', minWidth: 200, verticalAlign: 'top' }}>
        <textarea value={ka} onChange={e => setKa(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={missingKa ? '⚠ Missing Georgian…' : 'Georgian translation…'} rows={2} style={taStyle(missingKa && !ka.trim())} />
      </td>
      <td style={{ padding: '10px 12px', verticalAlign: 'top', maxWidth: 160 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {s.pages.length === 0
            ? <span style={{ fontSize: 11, color: 'var(--slate-300b)', fontStyle: 'italic' }}>—</span>
            : s.pages.map(pk => {
                const pg = PAGES.find(p => p.key === pk);
                return pg ? <span key={pk} style={{ fontSize: 10, background: 'var(--teal-50)', color: 'var(--teal-600)', border: '1px solid var(--teal-200)', borderRadius: 999, padding: '2px 7px', fontWeight: 600, whiteSpace: 'nowrap' }}>{pg.icon} {pg.label}</span> : null;
              })}
        </div>
      </td>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {showSave && (
            <ActionButton onClick={() => { if (canSave) onSave(s.id, en, ka); }} disabled={!canSave} style={{ padding: '4px 10px', fontSize: 12, background: canSave ? 'var(--teal-600)' : 'var(--slate-200)', color: canSave ? 'var(--white)' : 'var(--slate-400)' }}>
              Save
            </ActionButton>
          )}
          {dirty && (
            <ActionButton variant="secondary" onClick={() => { setEn(s.en); setKa(s.ka); }} style={{ padding: '4px 10px', fontSize: 12 }}>
              ×
            </ActionButton>
          )}
          <ActionButton variant="secondary" onClick={() => onEdit(s)} style={{ padding: '4px 10px', fontSize: 12 }}>Edit</ActionButton>
          <RowActions onDelete={() => onDelete(s.id)} canDelete={true} />
        </div>
      </td>
    </tr>
  );
}

export default function TranslationsPage() {
  const [strings, setStrings] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [pageFilter, setPageFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showMissing, setShowMissing] = useState(false);

  const [modal, setModal] = useState<null | 'add' | 'edit'>(null);
  const [form, setForm] = useState<Omit<Translation, 'id'>>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const token = () => localStorage.getItem('admin_token');

  useEffect(() => {
    fetch(`${API}/cms/config-translations`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const existing: Translation[] = data?.content?.strings || [];
        setStrings(existing.length > 0 ? existing : SEED.map(s => ({ ...s, id: genId() })));
      })
      .catch(() => setStrings(SEED.map(s => ({ ...s, id: genId() }))))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setModal(null); setDeleteId(null); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  async function persist(next: Translation[]) {
    setSaving(true);
    try {
      await fetch(`${API}/cms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ key: 'config-translations', slug: 'config-translations', title: 'Translations', status: 'PUBLISHED', content: { strings: next } }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  function openAdd() { setForm(EMPTY_FORM); setEditId(null); setModal('add'); }
  function openEdit(s: Translation) { setForm({ key: s.key, en: s.en, ka: s.ka, pages: s.pages }); setEditId(s.id); setModal('edit'); }

  function saveModal() {
    if (!form.key.trim() || !form.en.trim() || !form.ka.trim()) return;
    const next = modal === 'edit' && editId
      ? strings.map(s => s.id === editId ? { ...s, ...form } : s)
      : [...strings, { id: genId(), ...form }];
    setStrings(next);
    persist(next);
    setModal(null);
  }

  function saveInline(id: string, en: string, ka: string) {
    const next = strings.map(s => s.id === id ? { ...s, en, ka } : s);
    setStrings(next);
    persist(next);
  }

  function confirmDelete() {
    if (!deleteId) return;
    const next = strings.filter(s => s.id !== deleteId);
    setStrings(next);
    persist(next);
    setDeleteId(null);
  }

  const filtered = strings.filter(s => {
    if (pageFilter !== 'all' && !s.pages.includes(pageFilter)) return false;
    if (showMissing && s.ka.trim()) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.key.toLowerCase().includes(q) || s.en.toLowerCase().includes(q) || s.ka.toLowerCase().includes(q);
    }
    return true;
  });

  const missingTotal = strings.filter(s => !s.ka.trim()).length;
  const coverage = strings.length ? Math.round(((strings.length - missingTotal) / strings.length) * 100) : 100;

  const inp: React.CSSProperties = { width: '100%', border: '1px solid var(--slate-200)', borderRadius: 9, padding: '8px 11px', fontSize: 13, outline: 'none', background: 'var(--white)', fontFamily: 'inherit', boxSizing: 'border-box' as const };
  const ta: React.CSSProperties = { ...inp, resize: 'vertical' as const, minHeight: 68 };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 5 };
  const chipStyle = (on: boolean): React.CSSProperties => ({ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: on ? '1.5px solid var(--teal-600)' : '1.5px solid var(--slate-200)', background: on ? 'var(--teal-50)' : 'var(--white)', color: on ? 'var(--teal-600)' : 'var(--slate-400)', userSelect: 'none' as const });

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 4px' }}>Front-end Translations</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0 }}>Manage English and Georgian strings for the customer-facing website.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saving && <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Saving…</span>}
          {saved && <span style={{ fontSize: 12, color: 'var(--emerald-500)', fontWeight: 600 }}>✓ Saved</span>}
          <ActionButton variant="secondary" onClick={() => {
            const rows: string[][] = [['Key', 'English', 'Georgian', 'Pages']];
            strings.forEach(s => rows.push([s.key, s.en, s.ka, s.pages.join(', ')]));
            exportCsv(rows, 'frontend-translations.csv');
          }}>↓ Export CSV</ActionButton>
          <ActionButton onClick={openAdd}>+ Add string</ActionButton>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total strings',    value: strings.length,               color: 'var(--slate-900)' },
          { label: 'Translated (KA)',  value: strings.length - missingTotal, color: 'var(--green-600)' },
          { label: 'Missing Georgian', value: missingTotal,                  color: missingTotal > 0 ? 'var(--red-600)' : 'var(--green-600)' },
          { label: 'Coverage',         value: `${coverage}%`,               color: coverage === 100 ? 'var(--green-600)' : coverage >= 80 ? 'var(--amber-700)' : 'var(--red-600)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--slate-200b)', padding: '16px 20px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setPageFilter('all')}
            style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: pageFilter === 'all' ? 'var(--teal-600)' : 'var(--slate-100)', color: pageFilter === 'all' ? 'var(--white)' : 'var(--slate-500)', transition: 'all 0.12s' }}>
            🌐 All
          </button>
          {PAGES.map(p => (
            <button key={p.key} onClick={() => setPageFilter(p.key)}
              style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: pageFilter === p.key ? 'var(--teal-600)' : 'var(--slate-100)', color: pageFilter === p.key ? 'var(--white)' : 'var(--slate-500)', transition: 'all 0.12s' }}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowMissing(m => !m)}
          style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${showMissing ? 'var(--red-600)' : 'var(--slate-200)'}`, background: showMissing ? 'var(--red-50)' : 'var(--white)', color: showMissing ? 'var(--red-600)' : 'var(--slate-500)' }}>
          ⚠ Missing only {missingTotal > 0 && `(${missingTotal})`}
        </button>
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--slate-400)', pointerEvents: 'none' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search keys, English, Georgian…"
            style={{ paddingLeft: 30, paddingRight: search ? 28 : 10, paddingTop: 7, paddingBottom: 7, fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 9, outline: 'none', width: 240, background: 'var(--white)', color: 'var(--slate-900)' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--slate-400)', padding: 0 }}>×</button>}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{strings.length === 0 ? '📝' : '🔍'}</div>
            <p style={{ fontSize: 13 }}>{strings.length === 0 ? 'No strings yet — click "+ Add string"' : 'No strings match your filters'}</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Key', '🇬🇧 English', '🇬🇪 Georgian', 'Pages', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <TranslationRow key={s.id} s={s} onSave={saveInline} onEdit={openEdit} onDelete={id => setDeleteId(id)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--slate-900)' }}>{modal === 'add' ? 'Add String' : 'Edit String'}</h2>
              <button onClick={() => setModal(null)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, color: 'var(--slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
              <div>
                <label style={labelStyle}>Key <span style={{ color: 'var(--red-600)' }}>*</span> <span style={{ color: 'var(--slate-400)', fontWeight: 400, fontSize: 11 }}>(e.g. hero.heading)</span></label>
                <input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} placeholder="hero.heading" style={{ ...inp, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={labelStyle}>🇬🇧 English <span style={{ color: 'var(--red-600)' }}>*</span></label>
                <textarea value={form.en} onChange={e => setForm(f => ({ ...f, en: e.target.value }))} placeholder="English text…" style={ta} rows={3} />
              </div>
              <div>
                <label style={labelStyle}>🇬🇪 Georgian <span style={{ color: 'var(--red-600)' }}>*</span></label>
                <textarea value={form.ka} onChange={e => setForm(f => ({ ...f, ka: e.target.value }))} placeholder="Georgian text…" style={{ ...ta, borderColor: form.ka ? 'var(--slate-200)' : 'var(--amber-200)', background: form.ka ? 'var(--white)' : 'var(--amber-50)' }} rows={3} />
              </div>
              <div>
                <label style={labelStyle}>Assign to pages <span style={{ color: 'var(--slate-400)', fontWeight: 400, fontSize: 11 }}>(reference only)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {PAGES.map(p => {
                    const on = form.pages.includes(p.key);
                    return (
                      <span key={p.key} style={chipStyle(on)} onClick={() => setForm(f => ({ ...f, pages: on ? f.pages.filter(k => k !== p.key) : [...f.pages, p.key] }))}>
                        {p.icon} {p.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 28px', borderTop: '1px solid var(--slate-200)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <ActionButton onClick={saveModal} disabled={!form.key.trim() || !form.en.trim() || !form.ka.trim()} style={{ flex: 2, padding: '10px 0', justifyContent: 'center' }}>
                {modal === 'add' ? 'Add String' : 'Save Changes'}
              </ActionButton>
              <ActionButton variant="secondary" onClick={() => setModal(null)} style={{ flex: 1, padding: '10px 0', justifyContent: 'center' }}>
                Cancel
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div onClick={() => setDeleteId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 18, width: '100%', maxWidth: 380, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', padding: '28px 28px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--slate-900)' }}>Delete this string?</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-500)' }}>
              Key: <code style={{ fontFamily: 'monospace', background: 'var(--slate-100)', padding: '1px 6px', borderRadius: 4 }}>{strings.find(s => s.id === deleteId)?.key}</code>
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--slate-400)' }}>This will permanently remove the string and both translations.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <ActionButton onClick={confirmDelete} style={{ flex: 1, padding: '10px 0', background: 'var(--red-600)', justifyContent: 'center' }}>Delete</ActionButton>
              <ActionButton variant="secondary" onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '10px 0', justifyContent: 'center' }}>Cancel</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
