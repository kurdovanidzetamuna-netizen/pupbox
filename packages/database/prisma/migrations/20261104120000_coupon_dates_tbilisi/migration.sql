-- Promo code start and end days now mean Tbilisi days (UTC+4). Codes saved
-- before were set on UTC days: a start at 00:00 UTC (4am in Tbilisi) and an
-- end at 23:59:59 UTC (3:59am the next day in Tbilisi). Move both back to
-- Tbilisi's midnight; codes made with an exact time are left as they are.
UPDATE "Coupon" SET "startsAt" = "startsAt" - interval '4 hours' WHERE "startsAt"::time = '00:00:00';
UPDATE "Coupon" SET "expiresAt" = "expiresAt" - interval '4 hours' WHERE "expiresAt"::time = '23:59:59';
