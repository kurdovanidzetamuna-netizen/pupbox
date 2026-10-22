-- AlterTable
ALTER TABLE "SmsLog" ADD COLUMN     "sendAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SmsLog_status_sendAt_idx" ON "SmsLog"("status", "sendAt");
