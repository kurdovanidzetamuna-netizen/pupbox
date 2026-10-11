-- AlterTable
ALTER TABLE "User" ADD COLUMN     "marketingEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingEmailAt" TIMESTAMP(3),
ADD COLUMN     "marketingSms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingSmsAt" TIMESTAMP(3);

-- Existing consent covered both channels.
UPDATE "User" SET "marketingEmail" = "marketingConsent", "marketingSms" = "marketingConsent",
  "marketingEmailAt" = "marketingConsentAt", "marketingSmsAt" = "marketingConsentAt";
