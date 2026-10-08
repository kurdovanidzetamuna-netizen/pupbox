import { PrismaClient } from '@prisma/client';

/**
 * Georgian names and descriptions for the starter catalogue and plans, stored under
 * translations.ka where admin's Georgian tab reads and writes them.
 *
 * Only blank fields are filled, so anything already edited in admin wins.
 * Pass --force to overwrite with the text below. Safe to re-run.
 *
 *   npx ts-node prisma/seed-catalog-ka.ts
 */
const prisma = new PrismaClient();

const CATEGORIES: Record<string, Record<string, string>> = {
  treats: { name: 'ნუგბარი', description: 'გემრიელი ნუგბარი ძაღლებისთვის' },
  toys: { name: 'სათამაშოები', description: 'სახალისო სათამაშოები ძაღლებისთვის' },
  accessories: { name: 'აქსესუარები', description: 'აქსესუარები ძაღლებისთვის' },
  grooming: { name: 'მოვლა', description: 'მოვლის საშუალებები' },
};

const PRODUCTS: Record<string, Record<string, string>> = {
  'chicken-jerky-treats': {
    name: 'ქათმის ჩირი',
    shortDescription: '100%-ით ნატურალური ქათმის ჩირი ძაღლებისთვის',
    description: 'მზადდება თავისუფლად გაზრდილი ქათმისგან, ხელოვნური კონსერვანტების გარეშე. იდეალურია ყოველდღიურ ნუგბრად ან წვრთნისას ჯილდოდ.',
  },
  'rope-tug-toy': {
    name: 'თოკის სათამაშო',
    shortDescription: 'გამძლე, დაწნული თოკი ერთად სათამაშოდ',
    description: 'მაგარი ბამბის თოკი — შესანიშნავია გადაქაჩვის თამაშისთვის და კბილების მოვლისთვის. უსაფრთხოა ნებისმიერი ზომის ძაღლისთვის.',
  },
  'squeaky-plush-bear': {
    name: 'რბილი დათუნია წრიპინით',
    shortDescription: 'რბილი პლუშის დათუნია ჩაშენებული წრიპინით',
    description: 'ძალიან რბილი პლუშის სათამაშო გამძლე წრიპინით. იდეალურია ნაზი თამაშისა და ჩახუტებისთვის.',
  },
  'personalised-dog-bowl': {
    name: 'ჯამი სახელით',
    shortDescription: 'უჟანგავი ფოლადის ჯამი ამოტვიფრული სახელით',
    description: 'საკვებისთვის უსაფრთხო უჟანგავი ფოლადის ჯამი. შეიძლება ჭურჭლის სარეცხ მანქანაში რეცხვა. ხელმისაწვდომია 3 ზომაში.',
  },
  'paw-balm': {
    name: 'თათების მალამო',
    shortDescription: 'დამატენიანებელი მალამო მშრალი და დაბზარული თათებისთვის',
    // "Heals" in the English is a medicinal claim; the Georgian deliberately says softens and protects.
    description: 'ნატურალური შიას კარაქი და ფუტკრის ცვილი. არბილებს და იცავს თათის ბალიშებს მკაცრი ამინდისგან.',
  },
  'blueberry-biscuits': {
    name: 'მოცვის ბისკვიტები',
    shortDescription: 'ანტიოქსიდანტებით მდიდარი მოცვის ნუგბარი წვრთნისთვის',
    description: 'გამომცხვარია ნამდვილი მოცვითა და შვრიით. დაბალკალორიულია — იდეალური წვრთნისთვის.',
  },
};

/** Plan names are already Georgian; their one-line descriptions were English only. */
const PLANS: Record<string, Record<string, string>> = {
  '1-month': { description: 'გასინჯე Pupbox ერთი თვით. ვალდებულების გარეშე.' },
  '3-months': { description: 'დაზოგე 10% სამთვიანი გეგმით.' },
  '6-months': { description: 'საუკეთესო არჩევანი ერთგული ძაღლის პატრონებისთვის.' },
  '1-year': { description: 'მაქსიმალური დანაზოგი მთელი წლის განმავლობაში.' },
};

const force = process.argv.includes('--force');

/** translations.ka with blank fields filled from `ka` (or all of them with --force). */
function merged(translations: any, ka: Record<string, string>) {
  const current = (translations && typeof translations === 'object' ? translations : {}) as Record<string, any>;
  const currentKa = { ...(current.ka ?? {}) };
  const filled: string[] = [];
  for (const [field, text] of Object.entries(ka)) {
    if (force || !String(currentKa[field] ?? '').trim()) {
      currentKa[field] = text;
      filled.push(field);
    }
  }
  return { value: { ...current, ka: currentKa }, filled };
}

async function main() {
  for (const [slug, ka] of Object.entries(CATEGORIES)) {
    const row = await prisma.productCategory.findUnique({ where: { slug }, select: { id: true, translations: true } });
    if (!row) { console.log(`  · category ${slug} not found`); continue; }
    const { value, filled } = merged(row.translations, ka);
    if (filled.length) await prisma.productCategory.update({ where: { id: row.id }, data: { translations: value } });
    console.log(`  category ${slug.padEnd(22)} ${filled.length ? filled.join(', ') : 'already translated'}`);
  }
  for (const [slug, ka] of Object.entries(PRODUCTS)) {
    const row = await prisma.product.findUnique({ where: { slug }, select: { id: true, translations: true } });
    if (!row) { console.log(`  · product ${slug} not found`); continue; }
    const { value, filled } = merged(row.translations, ka);
    if (filled.length) await prisma.product.update({ where: { id: row.id }, data: { translations: value } });
    console.log(`  product  ${slug.padEnd(22)} ${filled.length ? filled.join(', ') : 'already translated'}`);
  }
  for (const [slug, ka] of Object.entries(PLANS)) {
    const row = await prisma.subscriptionPlan.findFirst({ where: { slug, deletedAt: null }, select: { id: true, translations: true } });
    if (!row) { console.log(`  · plan ${slug} not found`); continue; }
    const { value, filled } = merged(row.translations, ka);
    if (filled.length) await prisma.subscriptionPlan.update({ where: { id: row.id }, data: { translations: value } });
    console.log(`  plan     ${slug.padEnd(22)} ${filled.length ? filled.join(', ') : 'already translated'}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
