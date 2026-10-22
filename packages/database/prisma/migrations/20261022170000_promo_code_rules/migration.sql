-- Promo codes: more rules (cap, plan length, box types, first order) and a permanent stop.
ALTER TABLE "Coupon" ADD COLUMN "maxDiscount" DECIMAL(10,2),
ADD COLUMN "minPlanMonths" INTEGER,
ADD COLUMN "boxTierIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stoppedAt" TIMESTAMP(3);
