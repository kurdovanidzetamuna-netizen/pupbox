-- AlterTable
ALTER TABLE "BoxShipment" ADD COLUMN     "stockTakenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[];
