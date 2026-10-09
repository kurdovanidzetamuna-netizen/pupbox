-- Give existing subscriptions the address their boxes were going to: the
-- latest order address, or for a claimed gift the recipient's default address.
UPDATE "CustomerSubscription" s
SET "addressId" = o."addressId"
FROM (
  SELECT DISTINCT ON ("subscriptionId") "subscriptionId", "addressId"
  FROM "Order"
  WHERE "subscriptionId" IS NOT NULL AND "addressId" IS NOT NULL
  ORDER BY "subscriptionId", "createdAt" DESC
) o
WHERE s.id = o."subscriptionId" AND s."isGift" = false AND s."addressId" IS NULL;

UPDATE "CustomerSubscription" s
SET "addressId" = a.id
FROM (
  SELECT DISTINCT ON ("userId") "userId", id
  FROM "Address"
  WHERE "deletedAt" IS NULL
  ORDER BY "userId", "isDefault" DESC, "createdAt" DESC
) a
WHERE s."userId" = a."userId" AND s."addressId" IS NULL AND (s."isGift" = false OR s."giftClaimedAt" IS NOT NULL);
