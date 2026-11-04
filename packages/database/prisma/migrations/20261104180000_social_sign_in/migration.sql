-- Sign in with Google or Facebook: linked outside accounts, how each customer
-- first signed up, and accounts that have no password (yet).
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK');
CREATE TYPE "SignupMethod" AS ENUM ('EMAIL', 'GOOGLE', 'FACEBOOK');

ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "signupMethod" "SignupMethod" NOT NULL DEFAULT 'EMAIL';

CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserIdentity_provider_providerUserId_key" ON "UserIdentity"("provider", "providerUserId");
CREATE UNIQUE INDEX "UserIdentity_userId_provider_key" ON "UserIdentity"("userId", "provider");
CREATE INDEX "UserIdentity_userId_idx" ON "UserIdentity"("userId");

ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
