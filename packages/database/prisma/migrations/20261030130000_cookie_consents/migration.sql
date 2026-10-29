-- Answers to the cookie banner, kept as proof of consent.
CREATE TABLE "CookieConsent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "analytics" BOOLEAN NOT NULL,
    "ads" BOOLEAN NOT NULL,
    "version" INTEGER NOT NULL,
    "lang" TEXT,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CookieConsent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CookieConsent_createdAt_idx" ON "CookieConsent"("createdAt");
CREATE INDEX "CookieConsent_visitorId_idx" ON "CookieConsent"("visitorId");
