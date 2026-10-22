-- Addresses entered for gift orders before the tag existed: mark them as gift
-- addresses ("Gift · <recipient>") and take them out of the default spot.
UPDATE "Address" a
SET "isGift" = true,
    "isDefault" = false,
    "label" = COALESCE(a."label", LEFT('Gift · ' || COALESCE(NULLIF(TRIM(o."giftRecipientName"), ''), 'friend'), 40))
FROM "Order" o
WHERE o."addressId" = a."id" AND o."isGift" = true
  -- Only addresses used for gifts alone, never for the buyer's own orders.
  AND NOT EXISTS (SELECT 1 FROM "Order" own WHERE own."addressId" = a."id" AND own."isGift" = false);

-- Anyone left without a default gets their newest own address as the default.
UPDATE "Address" a
SET "isDefault" = true
WHERE a."id" IN (
  SELECT DISTINCT ON (x."userId") x."id"
  FROM "Address" x
  WHERE x."deletedAt" IS NULL AND x."isGift" = false
    AND NOT EXISTS (SELECT 1 FROM "Address" d WHERE d."userId" = x."userId" AND d."isDefault" = true AND d."deletedAt" IS NULL)
  ORDER BY x."userId", x."createdAt" DESC
);
