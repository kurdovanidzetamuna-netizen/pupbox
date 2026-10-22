-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "isGift" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "referralCode" TEXT;

-- AlterTable
ALTER TABLE "Dog" ADD COLUMN     "likedCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referralDiscount" DECIMAL(10,2);
