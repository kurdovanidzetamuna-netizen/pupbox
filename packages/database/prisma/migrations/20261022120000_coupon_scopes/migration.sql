-- Coupons: what they take money off (shop, box, built box, gift, delivery), any mix.
CREATE TYPE "CouponScope" AS ENUM ('SHOP', 'BOX', 'CUSTOM_BOX', 'GIFT', 'DELIVERY');

ALTER TABLE "Coupon" ADD COLUMN "scopes" "CouponScope"[] DEFAULT ARRAY['SHOP', 'BOX', 'CUSTOM_BOX', 'GIFT']::"CouponScope"[];

-- Carry over the old fields: products-only / plans-only, and free delivery.
UPDATE "Coupon" SET "scopes" = CASE "appliesTo"
  WHEN 'PRODUCTS' THEN ARRAY['SHOP', 'CUSTOM_BOX']::"CouponScope"[]
  WHEN 'SUBSCRIPTION' THEN ARRAY['BOX', 'GIFT']::"CouponScope"[]
  ELSE ARRAY['SHOP', 'BOX', 'CUSTOM_BOX', 'GIFT']::"CouponScope"[]
END;
UPDATE "Coupon" SET "scopes" = array_append("scopes", 'DELIVERY') WHERE "freeDelivery" = true;

ALTER TABLE "Coupon" DROP COLUMN "appliesTo", DROP COLUMN "freeDelivery";
DROP TYPE "CouponAppliesTo";
