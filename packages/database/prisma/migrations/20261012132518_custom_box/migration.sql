-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "customBoxId" TEXT;

-- AlterTable
ALTER TABLE "CustomerSubscription" ADD COLUMN     "customBoxId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "customBoxId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "inCustomBox" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "isCustomBox" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CustomBox" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "monthly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomBoxItem" (
    "id" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CustomBoxItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomBoxItem_boxId_productId_key" ON "CustomBoxItem"("boxId", "productId");

-- AddForeignKey
ALTER TABLE "CustomerSubscription" ADD CONSTRAINT "CustomerSubscription_customBoxId_fkey" FOREIGN KEY ("customBoxId") REFERENCES "CustomBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_customBoxId_fkey" FOREIGN KEY ("customBoxId") REFERENCES "CustomBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_customBoxId_fkey" FOREIGN KEY ("customBoxId") REFERENCES "CustomBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomBox" ADD CONSTRAINT "CustomBox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomBoxItem" ADD CONSTRAINT "CustomBoxItem_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "CustomBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomBoxItem" ADD CONSTRAINT "CustomBoxItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
