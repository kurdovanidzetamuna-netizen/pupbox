-- AlterTable
ALTER TABLE "CustomerSubscription" ADD COLUMN     "giftClaimToken" TEXT,
ADD COLUMN     "giftClaimedAt" TIMESTAMP(3),
ADD COLUMN     "isGift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purchasedByUserId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "giftDeliverOn" TIMESTAMP(3),
ADD COLUMN     "giftMessage" TEXT,
ADD COLUMN     "giftRecipientEmail" TEXT,
ADD COLUMN     "giftRecipientName" TEXT,
ADD COLUMN     "isGift" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "giftable" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSubscription_giftClaimToken_key" ON "CustomerSubscription"("giftClaimToken");

-- CreateIndex
CREATE INDEX "CustomerSubscription_isGift_giftClaimedAt_idx" ON "CustomerSubscription"("isGift", "giftClaimedAt");

-- AddForeignKey
ALTER TABLE "CustomerSubscription" ADD CONSTRAINT "CustomerSubscription_purchasedByUserId_fkey" FOREIGN KEY ("purchasedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

