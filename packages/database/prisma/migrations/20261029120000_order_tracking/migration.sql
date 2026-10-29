-- Where a buyer came from (ads, campaigns) and their cookie choice, per order.
ALTER TABLE "Order" ADD COLUMN "tracking" JSONB;
