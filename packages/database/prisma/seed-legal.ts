import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Publishes the Terms and Privacy pages from docs/legal/*.html into the CMS,
 * English as the page content and Georgian under translations.ka.
 *
 * The HTML files are the reviewed source of truth: edit them (or have the
 * lawyer's changes applied there) and run this again to update any
 * environment. Safe to re-run — pages are upserted by slug.
 *
 *   npx ts-node prisma/seed-legal.ts
 */
const prisma = new PrismaClient();
const LEGAL_DIR = join(__dirname, '..', '..', '..', 'docs', 'legal');

const PAGES = [
  { slug: 'terms', title: 'Terms & Conditions', kaTitle: 'მომსახურების პირობები', seoDesc: 'The terms for buying Pupbox subscriptions, gifts and products.' },
  { slug: 'privacy', title: 'Privacy Policy', kaTitle: 'კონფიდენციალურობის პოლიტიკა', seoDesc: 'What personal data Pupbox collects, why, and your rights.' },
];

async function main() {
  for (const p of PAGES) {
    const html = readFileSync(join(LEGAL_DIR, `${p.slug}.en.html`), 'utf8');
    const kaHtml = readFileSync(join(LEGAL_DIR, `${p.slug}.ka.html`), 'utf8');
    const data = {
      title: p.title,
      content: { html },
      translations: { ka: { title: p.kaTitle, html: kaHtml } },
      status: 'PUBLISHED' as const,
      seoTitle: p.title, // the site template appends "| Pupbox"
      seoDesc: p.seoDesc,
    };
    await prisma.cMSPage.upsert({
      where: { slug: p.slug },
      update: data,
      create: { key: p.slug, slug: p.slug, ...data },
    });
    console.log(`✓ ${p.slug} (${html.length} + ${kaHtml.length} chars)`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
