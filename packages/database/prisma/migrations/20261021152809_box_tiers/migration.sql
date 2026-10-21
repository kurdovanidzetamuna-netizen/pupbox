-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "tierId" TEXT;

-- CreateTable
CREATE TABLE "BoxTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "translations" JSONB,
    "tagline" TEXT,
    "description" TEXT,
    "highlights" TEXT[],
    "itemCount" INTEGER NOT NULL,
    "budgetMin" DECIMAL(10,2),
    "budgetMax" DECIMAL(10,2),
    "emoji" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoxTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoxTier_slug_key" ON "BoxTier"("slug");

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "BoxTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the three tiers (texts and numbers are edited later in admin → Box tiers)
INSERT INTO "BoxTier" ("id", "name", "slug", "tagline", "description", "highlights", "itemCount", "budgetMin", "budgetMax", "emoji", "featured", "sortOrder", "translations", "updatedAt") VALUES
('tier_mini', 'Mini', 'mini', 'The essentials, every month',
 'Five hand-picked items: tasty treats, a toy and something for daily care.',
 ARRAY['Treats, a toy and daily care', 'Picked for your dog''s size'], 5, 28, 30, '🐾', false, 1,
 '{"ka": {"name": "მინი", "tagline": "ყველაზე საჭირო, ყოველთვე", "description": "ხუთი შერჩეული ნივთი: გემრიელი ლაკომკა, სათამაშო და ყოველდღიური მოვლის საშუალება.", "highlights": ["ლაკომკა, სათამაშო და მოვლა", "შენი ძაღლის ზომაზე შერჩეული"]}}', CURRENT_TIMESTAMP),
('tier_standard', 'Standard', 'standard', 'Our favourite mix',
 'Six or seven items: more treats, two toys and daily care — the box most dogs love.',
 ARRAY['More treats and two toys', 'Daily care items included'], 7, 38, 42, '🎁', true, 2,
 '{"ka": {"name": "სტანდარტი", "tagline": "ჩვენი საყვარელი ნაკრები", "description": "ექვსი ან შვიდი ნივთი: მეტი ლაკომკა, ორი სათამაშო და ყოველდღიური მოვლა — კოლოფი, რომელიც ძაღლების უმეტესობას უყვარს.", "highlights": ["მეტი ლაკომკა და ორი სათამაშო", "ყოველდღიური მოვლის ნივთები"]}}', CURRENT_TIMESTAMP),
('tier_premium', 'Premium', 'premium', 'The best we can find',
 'Seven premium items from the best brands we stock, with tougher toys for strong chewers.',
 ARRAY['Our best brands', 'Tougher toys for strong chewers'], 7, 55, 60, '👑', false, 3,
 '{"ka": {"name": "პრემიუმი", "tagline": "საუკეთესო, რაც მოვძებნეთ", "description": "შვიდი პრემიუმ ნივთი ჩვენი საუკეთესო ბრენდებიდან და გამძლე სათამაშოები ძლიერად მღეჭავი ძაღლებისთვის.", "highlights": ["ჩვენი საუკეთესო ბრენდები", "გამძლე სათამაშოები ძლიერი ღეჭვისთვის"]}}', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
