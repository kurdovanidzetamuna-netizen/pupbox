-- Admin's auto-renew switch used to leave the renewal date as it was. A plan
-- that doesn't renew has no renewal date (renewals never read those rows, but
-- admin showed a date that would never come).
UPDATE "CustomerSubscription" SET "nextRenewalAt" = NULL WHERE NOT "autoRenewal" AND "nextRenewalAt" IS NOT NULL;
