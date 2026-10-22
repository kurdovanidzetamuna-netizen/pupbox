-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "phoneVerifiedVia" TEXT;

-- CreateTable
CREATE TABLE "PhoneOtp" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "userId" TEXT,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "proofHash" TEXT,
    "proofUntil" TIMESTAMP(3),
    "proofUsedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "providerId" TEXT,
    "error" TEXT,
    "userId" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhoneOtp_proofHash_key" ON "PhoneOtp"("proofHash");

-- CreateIndex
CREATE INDEX "PhoneOtp_phone_createdAt_idx" ON "PhoneOtp"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "PhoneOtp_ip_createdAt_idx" ON "PhoneOtp"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "SmsLog_createdAt_idx" ON "SmsLog"("createdAt");

-- CreateIndex
CREATE INDEX "SmsLog_kind_createdAt_idx" ON "SmsLog"("kind", "createdAt");
