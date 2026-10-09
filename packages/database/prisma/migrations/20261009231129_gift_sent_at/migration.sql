-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "giftSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_isGift_giftSentAt_giftDeliverOn_idx" ON "Order"("isGift", "giftSentAt", "giftDeliverOn");
