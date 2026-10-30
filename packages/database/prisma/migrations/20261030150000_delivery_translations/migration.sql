-- Delivery options get Georgian names from admin.
ALTER TABLE "DeliveryMethod" ADD COLUMN "translations" JSONB;
