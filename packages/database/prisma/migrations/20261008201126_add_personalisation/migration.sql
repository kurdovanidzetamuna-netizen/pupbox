-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "personalisation" JSONB;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "personalisation" JSONB;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "personalisation" JSONB;
