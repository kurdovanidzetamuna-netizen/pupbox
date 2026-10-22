-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "chargeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastChargeError" TEXT,
ADD COLUMN     "nextChargeAt" TIMESTAMP(3),
ADD COLUMN     "parentOrderId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "attempt" INTEGER,
ADD COLUMN     "cardBrand" TEXT,
ADD COLUMN     "cardMask" TEXT,
ADD COLUMN     "method" TEXT;

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "adminUserId" TEXT,
ADD COLUMN     "items" JSONB,
ADD COLUMN     "method" TEXT NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "Order_nextChargeAt_idx" ON "Order"("nextChargeAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_parentOrderId_fkey" FOREIGN KEY ("parentOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
