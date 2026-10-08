-- CreateEnum
CREATE TYPE "BoxShipmentStatus" AS ENUM ('TO_PACK', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BoxShipment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "boxNumber" INTEGER NOT NULL,
    "campaignId" TEXT,
    "addressId" TEXT,
    "status" "BoxShipmentStatus" NOT NULL DEFAULT 'TO_PACK',
    "trackingNumber" TEXT,
    "packedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoxShipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoxShipment_year_month_status_idx" ON "BoxShipment"("year", "month", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BoxShipment_subscriptionId_year_month_key" ON "BoxShipment"("subscriptionId", "year", "month");

-- AddForeignKey
ALTER TABLE "BoxShipment" ADD CONSTRAINT "BoxShipment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CustomerSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoxShipment" ADD CONSTRAINT "BoxShipment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "BoxCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoxShipment" ADD CONSTRAINT "BoxShipment_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
