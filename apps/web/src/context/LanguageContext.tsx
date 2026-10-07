'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PURCHASE_STRINGS } from './strings/purchase';
import { STORE_STRINGS } from './strings/store';

type Lang = 'en' | 'ka';

// Hardcoded fallbacks — used before CMS loads or when a key is missing
const FB: Record<string, { en: string; ka: string }> = {
  'nav.howItWorks':          { en: 'How it works',               ka: 'როგორ მუშაობს' },
  'nav.pricing':             { en: 'Pricing',                    ka: 'ფასები' },
  'nav.shop':                { en: 'Shop',                       ka: 'მაღაზია' },
  'nav.blog':                { en: 'Blog',                       ka: 'ბლოგი' },
  'nav.signIn':              { en: 'Sign In',                    ka: 'შესვლა' },
  'nav.subscribe':           { en: 'Subscribe',                  ka: 'გამოწერა' },
  'nav.cart':                { en: 'Cart',                       ka: 'კალათა' },
  'nav.account':             { en: 'My account',                 ka: 'ჩემი ანგარიში' },
  'nav.menu':                { en: 'Menu',                       ka: 'მენიუ' },
  'nav.language':            { en: 'Language',                   ka: 'ენა' },
  'hero.badge':              { en: '🐶 Monthly Dog Subscription Boxes · Georgia', ka: '🐶 ყოველთვიური ყუთის გამოწერა · საქართველო' },
  'hero.heading':            { en: 'Your dog deserves a surprise every month', ka: 'შენი ძაღლი იმსახურებს სიურპრიზს ყოველ თვე' },
  'hero.headingAccent':      { en: 'a surprise every month',     ka: 'სიურპრიზს ყოველ თვე' },
  'hero.description':        { en: "Curated boxes of premium treats, toys and accessories — tailored to your dog's size and breed. Delivered across Georgia.", ka: 'პრემიუმ საჭმლის, სათამაშოებისა და აქსესუარების კურირებული კოლოფი — მორგებული შენი ძაღლის ზომასა და ჯიშზე. მიწოდება მთელ საქართველოში.' },
  'hero.cta1':               { en: 'Start Your Subscription →',  ka: 'გამოწერის დაწყება →' },
  'hero.cta2':               { en: '🎁 Give as a Gift',           ka: '🎁 საჩუქრად გადაცემა' },
  'hero.cta3':               { en: 'See How It Works',           ka: 'როგორ მუშაობს' },
  'hero.step1':              { en: 'Sign Up',                    ka: 'რეგისტრაცია' },
  'hero.step2':              { en: 'Set Up Dog',                 ka: 'ძაღლის დამატება' },
  'hero.step3':              { en: 'Choose Plan',                ka: 'გეგმის არჩევა' },
  'hero.step4':              { en: 'Get Delivered',              ka: 'მიწოდება' },
  'hero.cancelNote':         { en: '✅ Cancel anytime, no fee', ka: '✅ გაუქმება ნებისმიერ დროს, საფასურის გარეშე' },
  'stats.happyDogs':         { en: 'Happy dogs',                 ka: 'ბედნიერი ძაღლი' },
  'stats.avgRating':         { en: 'Average rating',             ka: 'საშუალო შეფასება' },
  'stats.productsPerBox':    { en: 'Products per box',           ka: 'პროდუქტი კოლოფში' },
  'box.heading':             { en: "What's inside every box?",   ka: 'რა არის ყოველ კოლოფში?' },
  'box.description':         { en: "Every box is handpicked by our team and personalised to your dog's size and preferences.", ka: 'ყოველი კოლოფი ხელით შეირჩევა ჩვენი გუნდის მიერ და მორგებულია შენი ძაღლის ზომასა და პრეფერენციებზე.' },
  'box.item1.title':         { en: 'Premium Treats',             ka: 'პრემიუმ საჭმელი' },
  'box.item1.desc':          { en: "Locally sourced and imported treats chosen for your dog's size and dietary needs.", ka: 'ადგილობრივი და იმპორტირებული საჭმელი, შერჩეული შენი ძაღლის ზომისა და კვებითი საჭიროებების მიხედვით.' },
  'box.item2.title':         { en: 'Fun Toys',                   ka: 'სახალისო სათამაშოები' },
  'box.item2.desc':          { en: 'Durable, vet-approved toys to keep your pup entertained and mentally stimulated.', ka: 'გამძლე, ვეტერინარის მიერ დამტკიცებული სათამაშოები, რომელიც შენს ლეკვს გართობს.' },
  'box.item3.title':         { en: 'Grooming & Accessories',     ka: 'მოვლა და აქსესუარები' },
  'box.item3.desc':          { en: 'Quality grooming products, bandanas, collars and more — all selected for your breed.', ka: 'ხარისხიანი მოვლის პროდუქტები, ბანდანები, საყელოები და სხვა — ყველაფერი შერჩეული შენი ჯიშისთვის.' },
  'box.item4.title':         { en: 'Surprise Item',              ka: 'სიურპრიზი' },
  'box.item4.desc':          { en: 'Every box includes at least one exclusive surprise product your dog will love.', ka: 'ყოველ კოლოფში მინიმუმ ერთი ექსკლუზიური სიურპრიზი.' },
  'box.item5.title':         { en: 'Breed-Specific Selection',   ka: 'ჯიშზე მორგებული შერჩევა' },
  'box.item5.desc':          { en: "Tell us your dog's breed and we'll tailor the products to their specific needs.", ka: 'გვიამბე შენი ძაღლის ჯიშის შესახებ და ჩვენ პროდუქტებს მის საჭიროებებზე მოვარგებთ.' },
  'box.item6.title':         { en: '5–8 Full-Size Products',     ka: '5–8 სრული ზომის პროდუქტი' },
  'box.item6.desc':          { en: 'No sample packets — only full-size premium products worth more than your subscription price.', ka: 'არანაირი ნიმუშები — მხოლოდ სრული ზომის პრემიუმ პროდუქტები.' },
  'hiw.heading':             { en: 'How Pupbox works',           ka: 'Pupbox-ი როგორ მუშაობს' },
  'hiw.subheading':          { en: 'Get started in minutes. Your first box ships within 3–5 business days.', ka: 'დაიწყე წუთებში. პირველი კოლოფი გამოიგზავნება 3–5 სამუშაო დღეში.' },
  'hiw.step1.title':         { en: 'Choose a plan',              ka: 'აირჩიე გეგმა' },
  'hiw.step1.desc':          { en: 'Pick monthly, 3-month, 6-month or annual. Longer plans save more.', ka: 'აირჩიე ყოველთვიური, 3-თვიანი, 6-თვიანი ან წლიური. გრძელვადიანი გეგმები უფრო ხელსაყრელია.' },
  'hiw.step2.title':         { en: 'Tell us about your dog',     ka: 'გვიამბე ძაღლის შესახებ' },
  'hiw.step2.desc':          { en: 'Size, breed, preferences — we personalise every single box.', ka: 'ზომა, ჯიში, პრეფერენციები — ჩვენ ყოველ კოლოფს პირადად მოვარგებთ.' },
  'hiw.step3.title':         { en: 'We pack your box',           ka: 'ვაწყობთ კოლოფს' },
  'hiw.step3.desc':          { en: 'Our team handpicks 5–8 products perfectly suited for your pup.', ka: 'ჩვენი გუნდი ხელით ირჩევს 5–8 პროდუქტს შენი ლეკვისთვის.' },
  'hiw.step4.title':         { en: 'Enjoy & repeat',             ka: 'ისიამოვნე და გაიმეორე' },
  'hiw.step4.desc':          { en: 'A fresh surprise arrives every month. Cancel anytime.', ka: 'ახალი სიურპრიზი ყოველ თვე. გაუქმება — ნებისმიერ დროს.' },
  'plans.heading':           { en: 'Simple, transparent pricing', ka: 'მარტივი, გამჭვირვალე ფასები' },
  'plans.subheading':        { en: 'Longer plans save more. All prices in Georgian Lari (₾).', ka: 'გრძელვადიანი გეგმები უფრო ხელსაყრელია. ყველა ფასი ქართულ ლარში (₾).' },
  'plans.benefit1.title':    { en: 'Free delivery',              ka: 'უფასო მიწოდება' },
  'plans.benefit1.desc':     { en: 'All subscription boxes include free delivery across Georgia.', ka: 'ყველა გამოწერის კოლოფი მოიცავს უფასო მიწოდებას მთელ საქართველოში.' },
  'plans.benefit2.title':    { en: 'Cancel anytime',             ka: 'გაუქმება ნებისმიერ დროს' },
  'plans.benefit2.desc':     { en: 'No contracts. Cancel your subscription whenever you want.', ka: 'ხელშეკრულება არ არის. გააუქმე გამოწერა ნებისმიერ დროს.' },
  'plans.benefit3.title':    { en: 'Customer support',           ka: 'მომხმარებლის მხარდაჭერა' },
  'plans.benefit3.desc':     { en: 'Our team is here to help with any questions about your order.', ka: 'ჩვენი გუნდი მზადაა დაგეხმარო ნებისმიერ კითხვაში.' },
  'testimonials.heading':    { en: 'Dogs (and owners) love Pupbox', ka: 'ძაღლები (და მათი პატრონები) უყვართ Pupbox-ს' },
  'testimonials.subheading': { en: 'Join hundreds of happy Pupbox families across Georgia.', ka: 'შეუერთდი ასობით ბედნიერ Pupbox ოჯახს საქართველოში.' },
  'testimonials.t1.quote':   { en: 'My dog Max goes crazy when the box arrives! The treats are excellent quality and everything is perfectly sized for a large dog.', ka: 'ჩემი ძაღლი მაქსი გიჟდება, როდესაც კოლოფი ჩამოდის! საჭმლის ხარისხი შესანიშნავია.' },
  'testimonials.t2.quote':   { en: 'Worth every lari. The personalisation is real — every box has exactly the right products for a small dog. Amazing service!', ka: 'ყოველი ლარი ღირს. პერსონალიზაცია რეალურია — ყოველ კოლოფში ზუსტად სწორი პროდუქტებია. მშვენიერი სერვისი!' },
  'testimonials.t3.quote':   { en: "We've been subscribers for 6 months and every box feels like a gift. The bonus surprise items always make my dog's day!", ka: '6 თვეა ვიყენებთ და ყოველი კოლოფი საჩუქრად გვეჩვენება. ბონუს სიურპრიზები ყოველთვის ახარებს ჩემს ძაღლს!' },
  'faq.heading':             { en: 'Frequently asked questions', ka: 'ხშირად დასმული კითხვები' },
  'faq.q1':                  { en: 'When will my first box arrive?', ka: 'როდის ჩამოვა პირველი კოლოფი?' },
  'faq.a1':                  { en: 'Your first box ships within 3–5 business days after your subscription is confirmed. Delivery across Georgia typically takes 1–3 additional days.', ka: 'პირველი კოლოფი გამოიგზავნება გამოწერის დადასტურებიდან 3–5 სამუშაო დღეში.' },
  'faq.q2':                  { en: 'Can I customise the box for my dog?', ka: 'შეიძლება კოლოფის კუსტომიზაცია?' },
  'faq.a2':                  { en: "Yes! When you sign up, you tell us your dog's name, breed, size and preferences.", ka: 'დიახ! რეგისტრაციისას გვეუბნები ძაღლის სახელს, ჯიშს, ზომასა და პრეფერენციებს.' },
  'faq.q3':                  { en: 'Can I cancel my subscription?', ka: 'შეიძლება გამოწერის გაუქმება?' },
  'faq.a3':                  { en: 'Yes. Cancel any time from your account, with no fee — future renewals and boxes stop.', ka: 'დიახ. გააუქმე ნებისმიერ დროს ანგარიშიდან, საფასურის გარეშე — მომავალი განახლებები და ყუთები შეწყდება.' },
  'faq.q4':                  { en: "What if my dog doesn't like something in the box?", ka: 'რა მოხდება, თუ კოლოფში რაღაც არ მოეწონება?' },
  'faq.a4':                  { en: "Contact our support team and we'll replace the item or apply a credit to your next box.", ka: 'დაუკავშირდი ჩვენს გუნდს და ჩვენ ჩავანაცვლებთ ან კრედიტს ჩაგითვლით შემდეგ კოლოფში.' },
  'faq.q5':                  { en: 'Do you deliver outside Tbilisi?', ka: 'მიატანთ თბილისის გარეთ?' },
  'faq.a5':                  { en: 'Yes! We deliver to all major cities and most regions across Georgia, including Tbilisi, Batumi, Kutaisi, Rustavi, and more.', ka: 'დიახ! ვაწვდით საქართველოს ყველა მთავარ ქალაქსა და რეგიონში.' },
  'cta.heading':             { en: "Make your dog's month, every month.", ka: 'გაახარე შენი ძაღლი, ყოველ თვე.' },
  'cta.headingAccent':       { en: 'every month.',                        ka: 'ყოველ თვე.' },
  'cta.description':         { en: 'Join hundreds of Georgian dog owners who already trust Pupbox. First box ships in 3–5 days.', ka: 'შეუერთდი ასობით ქართველ ძაღლის პატრონს, ვინც უკვე ენდობა Pupbox-ს. პირველი კოლოფი 3–5 დღეში.' },
  'cta.socialProof':         { en: '500+ happy pups in Georgia',          ka: '500+ ბედნიერი ლეკვი საქართველოში' },
  'cta.trustChip1':          { en: '✅ Cancel anytime',                   ka: '✅ გაუქმება ნებისმიერ დროს' },
  'cta.trustChip2':          { en: '🚚 Free delivery',                    ka: '🚚 უფასო მიწოდება' },
  'cta.trustChip3':          { en: '🎁 Personalised boxes',               ka: '🎁 პერსონალიზებული კოლოფები' },
  'cta.trustChip4':          { en: '⭐ 4.9 rating',                       ka: '⭐ 4.9 შეფასება' },
  'cta.btn1':                { en: 'Start Your Subscription →',           ka: 'გამოწერის დაწყება →' },
  'cta.btn2':                { en: 'Compare Plans',                       ka: 'გეგმების შედარება' },
  'pricing.hero.heading':    { en: 'Simple, transparent pricing',         ka: 'მარტივი, გამჭვირვალე ფასები' },
  'pricing.hero.sub':        { en: 'Choose a plan that works best for you and your dog. Cancel anytime.', ka: 'აირჩიე გეგმა, რომელიც შენთვის და შენი ძაღლისთვის ყველაზე კარგია. გაუქმება ნებისმიერ დროს.' },
  'pricing.includes.heading':{ en: 'Every plan includes',                 ka: 'ყველა გეგმა მოიცავს' },
  'pricing.includes.i1':     { en: "📦 Handpicked products for your dog's size and breed", ka: '📦 ხელით შერჩეული პროდუქტები შენი ძაღლის ზომისა და ჯიშისთვის' },
  'pricing.includes.i2':     { en: '🚚 Free delivery on all subscription boxes', ka: '🚚 უფასო მიწოდება ყველა გამოწერის კოლოფზე' },
  'pricing.includes.i3':     { en: "🐾 Personalised to your dog's preferences", ka: '🐾 მორგებული შენი ძაღლის პრეფერენციებზე' },
  'pricing.includes.i4':     { en: '💬 Dedicated customer support',       ka: '💬 მომხმარებელთა სპეციალური მხარდაჭერა' },
  'pricing.includes.i5':     { en: '🔄 Cancel anytime, no fee', ka: '🔄 გაუქმება ნებისმიერ დროს, საფასურის გარეშე' },
  'pricing.includes.i6':     { en: '🎁 Surprise bonus items in selected plans', ka: '🎁 სიურპრიზ ბონუს ნივთები გარკვეულ გეგმებში' },
  'pricing.toggle.myDog':    { en: '🐾 For My Dog',                       ka: '🐾 ჩემი ძაღლისთვის' },
  'pricing.toggle.gift':     { en: '🎁 Give as a Gift',                   ka: '🎁 საჩუქრად' },
  'pricing.gift.banner':     { en: "You'll be able to enter the recipient's details and a personalised message at checkout.", ka: 'შეძლებ შეიყვანო მიმღების მონაცემები და პერსონალური შეტყობინება გამოწერის დადასტურებისას.' },
  'pricing.planCard.popular':{ en: '⭐ Most Popular',                     ka: '⭐ ყველაზე პოპულარული' },
  'pricing.planCard.bestValue':{ en: '🏆 Best Value',                     ka: '🏆 საუკეთესო ღირებულება' },
  'pricing.planCard.gift':   { en: '🎁 Great Gift',                       ka: '🎁 შესანიშნავი საჩუქარი' },
  'pricing.planCard.cta':    { en: 'Get Started →',                       ka: 'დაწყება →' },
  'pricing.planCard.giftCta':{ en: '🎁 Gift This Plan →',                 ka: '🎁 საჩუქრად გადაცემა →' },
  'pricing.planCard.freeDelivery': { en: '✓ Free delivery',               ka: '✓ უფასო მიწოდება' },
  'hiw.page.badge':          { en: '🐾 Simple 5-step journey',            ka: '🐾 მარტივი 5-საფეხურიანი გზა' },
  'hiw.page.heading':        { en: 'From Click to',                       ka: 'დაწკაპუნებიდან' },
  'hiw.page.headingAccent':  { en: 'Happy Pup',                           ka: 'ბედნიერ ლეკვამდე' },
  'hiw.page.description':    { en: 'A curated monthly box of treats, toys, and accessories. Simple, fun, and completely personalised.', ka: 'კურირებული ყოველთვიური კოლოფი საჭმლით, სათამაშოებითა და აქსესუარებით. მარტივი, სახალისო და სრულიად პერსონალიზებული.' },
  'hiw.page.step1.title':    { en: 'Choose Your Plan',                    ka: 'აირჩიე გეგმა' },
  'hiw.page.step1.desc':     { en: 'Pick monthly, 3-month, 6-month, or annual. The longer you commit, the more you save.', ka: 'აირჩიე ყოველთვიური, 3-თვიანი, 6-თვიანი ან წლიური. რაც უფრო გრძელია, მით უფრო ხელსაყრელია.' },
  'hiw.page.step2.title':    { en: 'Tell Us About Your Dog',              ka: 'გვიამბე ძაღლის შესახებ' },
  'hiw.page.step2.desc':     { en: "Share your dog's name, breed, size, and dietary needs so we can personalise every single box.", ka: 'გაგვიზიარე ძაღლის სახელი, ჯიში, ზომა და კვებითი მოთხოვნები, რომ ყოველ კოლოფს პირადად მოვარგოთ.' },
  'hiw.page.step3.title':    { en: 'We Curate Your Box',                  ka: 'ვაკომპლექტებთ კოლოფს' },
  'hiw.page.step3.desc':     { en: 'Our team handpicks premium treats, toys, and accessories tailored perfectly to your pup.', ka: 'ჩვენი გუნდი ხელით ირჩევს პრემიუმ საჭმელს, სათამაშოებსა და აქსესუარებს — ზუსტად შენი ლეკვისთვის.' },
  'hiw.page.step4.title':    { en: 'Delivered to Your Door',              ka: 'მიწოდება კართან' },
  'hiw.page.step4.desc':     { en: 'Your box ships across all of Georgia — standard or express, you choose.', ka: 'კოლოფი გამოიგზავნება მთელ საქართველოში — სტანდარტული ან ექსპრესი, შენი არჩევანია.' },
  'hiw.page.step5.title':    { en: 'Your Dog Goes Wild',                  ka: 'ძაღლი ბედნიერია' },
  'hiw.page.step5.desc':     { en: 'Watch your pup unbox their surprise. Share the joy and earn rewards by referring friends!', ka: 'უყურე ლეკვს, როგორ ხსნის სიურპრიზს. გაუზიარე სიხარული და მიიღე ჯილდო მეგობრების მოყვანით!' },
  'hiw.page.faq.heading':    { en: 'Got questions?',                      ka: 'გაქვთ კითხვები?' },
  'hiw.page.faq.sub':        { en: 'Everything you need to know before your first box.', ka: 'ყველაფერი, რაც უნდა იცოდე პირველი კოლოფამდე.' },
  'hiw.page.cta.heading':    { en: 'Your dog deserves a surprise every month', ka: 'შენი ძაღლი იმსახურებს სიურპრიზს ყოველ თვე' },
  'hiw.page.cta.desc':       { en: 'Curated treats, toys & accessories — tailored to your pup. From ₾49. Cancel anytime.', ka: 'კურირებული საჭმელი, სათამაშოები და აქსესუარები — მორგებული შენი ლეკვისთვის. ₾49-დან. გაუქმება ნებისმიერ დროს.' },
  'hiw.page.cta.btn1':       { en: 'Get Started →',                       ka: 'დაწყება →' },
  'hiw.page.cta.btn2':       { en: 'View Pricing',                        ka: 'ფასების ნახვა' },
  'blog.badge':              { en: '🐶 Dog Care Blog',                    ka: '🐶 ძაღლის მოვლის ბლოგი' },
  'blog.heading':            { en: 'Tips, Guides & Dog Advice',           ka: 'რჩევები, გიდები და ძაღლის შესახებ' },
  'blog.description':        { en: 'Expert breed guides, training tips, health insights, and more — from the Pupbox team.', ka: 'ჯიშის გიდები, ვარჯიშის რჩევები, ჯანმრთელობის ინფორმაცია და სხვა — Pupbox-ის გუნდისგან.' },
  'blog.empty':              { en: 'No posts yet',                        ka: 'სტატიები ჯერ არ არის' },
  'blog.empty.desc':         { en: 'Our team is working on expert dog care content. Check back soon!', ka: 'ჩვენი გუნდი მუშაობს ძაღლის მოვლის ექსპერტულ კონტენტზე. მალე შეამოწმე!' },
  'blog.cta.heading':        { en: 'Spoil your dog every month',          ka: 'გაახარე შენი ძაღლი ყოველ თვე' },
  'blog.cta.desc':           { en: 'Curated boxes of treats, toys & accessories.', ka: 'კურირებული კოლოფები საჭმლით, სათამაშოებითა და აქსესუარებით.' },
  'blog.cta.btn':            { en: 'Subscribe Now',                       ka: 'გამოწერა' },
  'blog.readMore':           { en: 'Read →',                              ka: 'წაკითხვა →' },
  'blog.categories':         { en: 'Categories',                          ka: 'კატეგორიები' },
  'blog.allPosts':           { en: 'All posts',                           ka: 'ყველა სტატია' },
  'login.heading':           { en: 'Sign in to your account',             ka: 'ანგარიშში შესვლა' },
  'login.email':             { en: 'Email',                               ka: 'ელ-ფოსტა' },
  'login.password':          { en: 'Password',                            ka: 'პაროლი' },
  'login.btn':               { en: 'Sign In',                             ka: 'შესვლა' },
  'login.loading':           { en: 'Signing in...',                       ka: 'შესვლა...' },
  'login.noAccount':         { en: "Don't have an account?",              ka: 'ანგარიში არ გაქვს?' },
  'login.createOne':         { en: 'Create one',                          ka: 'შექმენი' },
  'register.heading':        { en: 'Create your account',                 ka: 'ანგარიშის შექმნა' },
  'register.subheading':     { en: 'Join thousands of happy dogs across Georgia 🐾', ka: 'შეუერთდი ათასობით ბედნიერ ძაღლს საქართველოში 🐾' },
  'register.firstName':      { en: 'First name',                          ka: 'სახელი' },
  'register.lastName':       { en: 'Last name',                           ka: 'გვარი' },
  'register.phone':          { en: 'Phone (optional)',                    ka: 'ტელეფონი (სურვილისამებრ)' },
  'register.referral':       { en: 'Referral code (optional)',            ka: 'რეფერალური კოდი (სურვილისამებრ)' },
  'register.btn':            { en: 'Create Account',                      ka: 'ანგარიშის შექმნა' },
  'register.loading':        { en: 'Creating account...',                 ka: 'შექმნა...' },
  'register.haveAccount':    { en: 'Already have an account?',            ka: 'უკვე გაქვს ანგარიში?' },
  'register.signIn':         { en: 'Sign in',                             ka: 'შესვლა' },
  'footer.tagline':          { en: 'Monthly curated subscription boxes for your dog. Delivered across Georgia with love.', ka: 'ყოველთვიური კურირებული კოლოფები შენი ძაღლისთვის. მიწოდება მთელ საქართველოში სიყვარულით.' },
  'footer.company':          { en: 'Company',                             ka: 'კომპანია' },
  'footer.account':          { en: 'Account',                             ka: 'ანგარიში' },
  'footer.createAccount':    { en: 'Create account',                      ka: 'ანგარიშის შექმნა' },
  'footer.myOrders':         { en: 'My orders',                           ka: 'ჩემი შეკვეთები' },
  'footer.copyright':        { en: 'All rights reserved. Made with 🐾 in Georgia.', ka: 'ყველა უფლება დაცულია. შექმნილია 🐾 საქართველოში.' },
  'footer.privacy':          { en: 'Privacy Policy',                      ka: 'კონფიდენციალობის პოლიტიკა' },
  'footer.terms':            { en: 'Terms of Service',                    ka: 'მომსახურების პირობები' },
  'global.backToHome':       { en: 'Back to homepage',                    ka: 'მთავარ გვერდზე დაბრუნება' },
  'global.loading':          { en: 'Loading…',                            ka: 'იტვირთება…' },
  'global.perMonth':         { en: '/month',                              ka: '/თვეში' },
  'global.savePercent':      { en: 'Save',                                ka: 'დაზოგე' },
  'global.vsMonthly':        { en: 'vs monthly',                          ka: 'ყოველთვიურთან შედარებით' },
  'global.freeDelivery':     { en: 'Free delivery',                       ka: 'უფასო მიწოდება' },
  'global.cancelAnytime':    { en: 'Cancel anytime',                      ka: 'გაუქმება ნებისმიერ დროს' },
  'boxContents.heading':     { en: '📦 Inside every box',                 ka: '📦 ყოველ კოლოფში' },
  'boxContents.sub':         { en: 'What your pup gets each month',       ka: 'რას იღებს შენი ლეკვი ყოველ თვე' },
  'boxContents.note':        { en: 'Exact items vary by plan, dog size, and season. All products are vet-reviewed and pet-safe.', ka: 'კონკრეტული ნივთები განსხვავდება გეგმის, ძაღლის ზომისა და სეზონის მიხედვით. ყველა პროდუქტი ვეტერინარის მიერ შემოწმებულია.' },
  'boxContents.tab.treats':  { en: '🦴 Treats',                           ka: '🦴 საჭმელი' },
  'boxContents.tab.toys':    { en: '🧸 Toys',                             ka: '🧸 სათამაშოები' },
  'boxContents.tab.grooming':{ en: '✨ Grooming',                          ka: '✨ მოვლა' },
  'boxContents.tab.accessories': { en: '🎀 Accessories',                  ka: '🎀 აქსესუარები' },
  'boxContents.tab.surprise':{ en: '🎁 Surprise',                         ka: '🎁 სიურპრიზი' },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Look up a translation by flat key. Falls back to hardcoded value, then the key itself. */
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ka',
  setLang: () => {},
  t: (key) => FB[key]?.ka ?? key,
});

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ka');
  // CMS overrides: key → { en, ka }
  const [cms, setCms] = useState<Record<string, { en: string; ka: string }>>({});

  // Restore saved language preference
  useEffect(() => {
    const saved = localStorage.getItem('pupbox_lang') as Lang | null;
    if (saved === 'en' || saved === 'ka') setLangState(saved);
  }, []);

  // Fetch translations from CMS once on mount
  useEffect(() => {
    fetch(`${API}/cms/config-translations`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const strings: { key: string; en: string; ka: string }[] = data?.content?.strings || [];
        if (!strings.length) return;
        const map: Record<string, { en: string; ka: string }> = {};
        for (const s of strings) {
          if (s.key) map[s.key] = { en: s.en || '', ka: s.ka || '' };
        }
        setCms(map);
      })
      .catch(() => {});
  }, []);

  // Screen readers and search engines read the page language from <html>.
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('pupbox_lang', l);
  }

  const t = useCallback((key: string, fallback?: string): string => {
    const entry = cms[key] ?? FB[key] ?? PURCHASE_STRINGS[key] ?? STORE_STRINGS[key];
    if (entry) return entry[lang] || entry['en'] || fallback || key;
    return fallback || key;
  }, [lang, cms]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
