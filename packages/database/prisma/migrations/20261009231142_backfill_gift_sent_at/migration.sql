-- Gift cards for paid orders were sent at payment time (when not dated for
-- later) before giftSentAt existed. Mark them sent so the hourly sender
-- doesn't email them a second time.
UPDATE "Order"
SET "giftSentAt" = "updatedAt"
WHERE "isGift" = true
  AND "giftSentAt" IS NULL
  AND "status" IN ('PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'REFUNDED')
  AND ("giftDeliverOn" IS NULL OR "giftDeliverOn" <= now());
