-- AlterTable
ALTER TABLE "CustomerSubscription" ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refundDueAmount" DECIMAL(10,2);
