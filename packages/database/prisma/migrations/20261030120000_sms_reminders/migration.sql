-- Scheduled SMS reminders: what each one was for, so it is sent once.
ALTER TABLE "SmsLog" ADD COLUMN "ref" TEXT;
CREATE INDEX "SmsLog_ref_idx" ON "SmsLog"("ref");
