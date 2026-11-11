-- Plans admin cancelled (by cancelling or refunding their order) were left
-- without a cancel date and with renewal still switched on, so Reports never
-- counted them as ended. Give them the date they were last changed. Plans
-- that were never paid ("Not paid") didn't end anything and get no date.
UPDATE "CustomerSubscription"
SET "cancelledAt" = "updatedAt"
WHERE status = 'CANCELLED' AND "cancelledAt" IS NULL AND coalesce("cancelReason", '') <> 'Not paid';

UPDATE "CustomerSubscription"
SET "autoRenewal" = false, "nextRenewalAt" = NULL
WHERE status IN ('CANCELLED', 'EXPIRED') AND ("autoRenewal" OR "nextRenewalAt" IS NOT NULL);
