/**
 * Built-in copy for sign-up, verification, the welcome dog step and the
 * account extras (orders detail, extending a plan, dog photos).
 */
export const ACCOUNT_STRINGS: Record<string, { en: string; ka: string }> = {
  // ── Sign-up ──
  'reg.phone':              { en: 'Mobile number',              ka: 'მობილურის ნომერი' },
  'reg.phoneHint':          { en: "We'll text you a code to confirm it.", ka: 'დასადასტურებლად SMS კოდს გამოგიგზავნით.' },
  'reg.referral':           { en: 'Referral code (optional)',   ka: 'მოწვევის კოდი (არასავალდებულო)' },
  'reg.referralFrom':       { en: 'Invited by a friend — the code is filled in for you.', ka: 'მეგობარმა მოგიწვია — კოდი უკვე შევსებულია.' },
  'reg.consent':            { en: 'Send me offers, tips and reminders about my dog (you can stop any time).', ka: 'გამომიგზავნეთ შეთავაზებები, რჩევები და შეხსენებები ჩემი ძაღლის შესახებ (ნებისმიერ დროს შემიძლია გავაუქმო).' },
  'reg.e.firstName':        { en: 'First name is required',     ka: 'სახელი აუცილებელია' },
  'reg.e.lastName':         { en: 'Last name is required',      ka: 'გვარი აუცილებელია' },
  'reg.e.email':            { en: 'Enter a valid email address', ka: 'შეიყვანე სწორი ელფოსტა' },
  'reg.e.password':         { en: 'At least 8 characters',      ka: 'მინიმუმ 8 სიმბოლო' },
  'reg.e.phone':            { en: 'Enter a Georgian mobile number, e.g. 599 12 34 56', ka: 'შეიყვანე ქართული მობილურის ნომერი, მაგ. 599 12 34 56' },
  'reg.step.details':       { en: 'Your details',               ka: 'შენი მონაცემები' },
  'reg.step.verify':        { en: 'Confirm',                    ka: 'დადასტურება' },
  'reg.step.dog':           { en: 'Your dog',                   ka: 'შენი ძაღლი' },

  // ── Verification ──
  'ver.title':              { en: 'Confirm your phone and email', ka: 'დაადასტურე ტელეფონი და ელფოსტა' },
  'ver.sub':                { en: 'We sent a 6-digit code to each. It keeps your account and deliveries safe.', ka: 'ორივეზე 6-ნიშნა კოდი გამოგიგზავნეთ. ეს შენი ანგარიშისა და მიწოდების უსაფრთხოებისთვისაა.' },
  'ver.phone':              { en: 'SMS code sent to {to}',       ka: 'SMS კოდი გაიგზავნა ნომერზე {to}' },
  'ver.email':              { en: 'Email code sent to {to}',     ka: 'ელფოსტის კოდი გაიგზავნა მისამართზე {to}' },
  'ver.code':               { en: '6-digit code',                ka: '6-ნიშნა კოდი' },
  'ver.confirm':            { en: 'Confirm',                     ka: 'დადასტურება' },
  'ver.done':               { en: 'Confirmed',                   ka: 'დადასტურებულია' },
  'ver.resend':             { en: 'Send a new code',             ka: 'ახალი კოდის გაგზავნა' },
  'ver.resendIn':           { en: 'New code in {s}s',            ka: 'ახალი კოდი {s} წამში' },
  'ver.sent':               { en: 'New code sent',               ka: 'ახალი კოდი გაიგზავნა' },
  'ver.changePhone':        { en: 'Wrong number?',               ka: 'არასწორი ნომერია?' },
  'ver.savePhone':          { en: 'Save and send code',          ka: 'შენახვა და კოდის გაგზავნა' },
  'ver.continue':           { en: 'Continue →',                  ka: 'გაგრძელება →' },
  'ver.banner':             { en: 'Confirm your phone and email to order.', ka: 'შეკვეთისთვის დაადასტურე ტელეფონი და ელფოსტა.' },
  'ver.bannerBtn':          { en: 'Confirm now',                 ka: 'დადასტურება' },
  'ver.allSet':             { en: 'All set! 🎉',                 ka: 'მზადაა! 🎉' },

  // ── Welcome dog step ──
  'wel.title':              { en: 'Tell us about your dog 🐶',   ka: 'მოგვიყევი შენს ძაღლზე 🐶' },
  'wel.sub':                { en: 'Every box is picked for them. It takes a minute — or do it later in My dogs.', ka: 'ყოველი კოლოფი მისთვის შეირჩევა. ერთი წუთი დაგჭირდება — ან მოგვიანებით „ჩემს ძაღლებში“.' },
  'wel.save':               { en: 'Save my dog',                 ka: 'ძაღლის შენახვა' },
  'wel.skip':               { en: 'Skip for now',                ka: 'ახლა გამოტოვება' },

  // ── Account extras ──
  'acc.consent':            { en: 'Offers and reminders',        ka: 'შეთავაზებები და შეხსენებები' },
  'acc.consentSub':         { en: 'Birthday treats, restock reminders and the occasional offer, by email and SMS.', ka: 'დაბადების დღის საჩუქრები, შეხსენებები და შეთავაზებები ელფოსტითა და SMS-ით.' },
  'acc.consentOn':          { en: "You'll get offers and reminders.", ka: 'მიიღებ შეთავაზებებსა და შეხსენებებს.' },
  'acc.consentOff':         { en: "We won't send you offers.",   ka: 'შეთავაზებებს აღარ გამოგიგზავნით.' },
  'acc.verified':           { en: 'Confirmed',                   ka: 'დადასტურებულია' },
  'acc.notVerified':        { en: 'Not confirmed',               ka: 'დაუდასტურებელია' },

  // ── Dog photos ──
  'dog.photo':              { en: 'Photo',                       ka: 'ფოტო' },
  'dog.photoAdd':           { en: 'Add a photo',                 ka: 'ფოტოს დამატება' },
  'dog.photoChange':        { en: 'Change photo',                ka: 'ფოტოს შეცვლა' },
  'dog.photoRemove':        { en: 'Remove photo',                ka: 'ფოტოს წაშლა' },
  'dog.photoHint':          { en: 'JPG, PNG or WebP, up to 8 MB.', ka: 'JPG, PNG ან WebP, მაქსიმუმ 8 MB.' },
  'dog.photoUploading':     { en: 'Uploading…',                  ka: 'იტვირთება…' },

  // ── Plans: extend ──
  'sub.extend':             { en: 'Extend my plan',              ka: 'გამოწერის გაგრძელება' },
  'sub.extendSub':          { en: 'Add another {period} for {money}. It starts when the current one ends.', ka: 'დაამატე კიდევ {period} — {money}. დაიწყება მიმდინარე ვადის დასრულებისას.' },
  'sub.extendGo':           { en: 'Extend for {money}',          ka: 'გაგრძელება {money}' },
  'sub.extendFailed':       { en: "Couldn't start the payment. Please try again.", ka: 'გადახდა ვერ დაიწყო. სცადე თავიდან.' },
  'sub.addPlan':            { en: '+ Add a plan',                ka: '+ ახალი გეგმა' },

  // ── Orders: details ──
  'ord.view':               { en: 'View details',                ka: 'დეტალები' },
  'ord.hide':               { en: 'Hide details',                ka: 'დამალვა' },
  'ord.items':              { en: 'Items',                       ka: 'ნივთები' },
  'ord.deliverTo':          { en: 'Delivery to',                 ka: 'მიწოდება' },
  'ord.subtotal':           { en: 'Subtotal',                    ka: 'ჯამი' },
  'ord.discount':           { en: 'Discount',                    ka: 'ფასდაკლება' },
  'ord.delivery':           { en: 'Delivery',                    ka: 'მიწოდება' },
  'ord.total':              { en: 'Total',                       ka: 'სულ' },
  'ord.payment':            { en: 'Payment',                     ka: 'გადახდა' },
  'ord.tracking':           { en: 'Tracking number',             ka: 'თრექინგის ნომერი' },
  'ord.managePlan':         { en: 'Manage or cancel plan',       ka: 'გეგმის მართვა ან გაუქმება' },
  'ord.pay.PAID':           { en: 'Paid',                        ka: 'გადახდილია' },
  'ord.pay.PENDING':        { en: 'Waiting for payment',         ka: 'გადახდის მოლოდინში' },
  'ord.pay.FAILED':         { en: 'Payment failed',              ka: 'გადახდა ვერ შესრულდა' },
  'ord.pay.REFUNDED':       { en: 'Refunded',                    ka: 'დაბრუნებულია' },
  'ord.pay.PARTIALLY_REFUNDED': { en: 'Partly refunded',         ka: 'ნაწილობრივ დაბრუნებულია' },
  'ord.giftFor':            { en: 'Gift for {name}',             ka: 'საჩუქარი — {name}' },

  // ── Pupbox Run (mini game) ──
  'game.title':             { en: 'Pupbox Run — help the pup jump!', ka: 'Pupbox Run — დაეხმარე ლეკვს ხტომაში!' },
  'game.how':               { en: 'Tap, click or press Space to jump. Catch bones for +5.', ka: 'დააჭირე ან Space — ხტომა. დაიჭირე ძვლები +5 ქულისთვის.' },
  'game.start':             { en: 'Play',                        ka: 'თამაში' },
  'game.again':             { en: 'Play again',                  ka: 'თავიდან' },
  'game.over':              { en: 'Oops! Bumped into something', ka: 'უი! რაღაცას შეეჯახა' },
  'game.record':            { en: 'New best score! 🎉',          ka: 'ახალი რეკორდი! 🎉' },
  'game.score':             { en: 'Score',                       ka: 'ქულა' },
  'game.best':              { en: 'Best',                        ka: 'რეკორდი' },
  'game.aria':              { en: 'Pupbox Run game. Press Space to jump.', ka: 'თამაში Pupbox Run. ხტომისთვის დააჭირე Space-ს.' },
  'game.break':             { en: 'Break time 🐾',                ka: 'შესვენება 🐾' },
  'game.breakSub':          { en: 'A quick game while you choose. Beat your best!', ka: 'პატარა თამაში, სანამ ირჩევ. გააუმჯობესე რეკორდი!' },
  'game.offline':           { en: "You're offline",              ka: 'ინტერნეტი გაითიშა' },
  'game.offlineSub':        { en: 'No internet right now — play while it comes back.', ka: 'ინტერნეტი ახლა არ არის — ითამაშე, სანამ დაბრუნდება.' },
  'game.close':             { en: 'Close',                       ka: 'დახურვა' },

  // ── Small labels that used to be English-only ──
  'crumb.blog':             { en: 'Blog',                        ka: 'ბლოგი' },
  'blog.catEmpty':          { en: 'No posts in this category yet.', ka: 'ამ კატეგორიაში სტატიები ჯერ არ არის.' },
  'pricing.gift.heading':   { en: 'Gifting a Pupbox subscription', ka: 'Pupbox-ის გამოწერა საჩუქრად' },
  'aria.mainNav':           { en: 'Main menu',                   ka: 'მთავარი მენიუ' },
  'aria.checkoutSteps':     { en: 'Checkout steps',              ka: 'შეკვეთის ეტაპები' },
  'aria.signupSteps':       { en: 'Sign-up steps',               ka: 'რეგისტრაციის ეტაპები' },
};
