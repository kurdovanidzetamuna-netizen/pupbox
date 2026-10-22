-- "Show on site", separate from on/off: a hidden plan keeps renewing for the people already on it.
ALTER TABLE "SubscriptionPlan" ADD COLUMN "listed" BOOLEAN NOT NULL DEFAULT true;

-- The site sells Mini / Standard / Premium: plans without a box type start hidden.
UPDATE "SubscriptionPlan" SET "listed" = false WHERE "tierId" IS NULL AND "isCustomBox" = false;
