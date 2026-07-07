-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "translations" JSONB;

-- AlterTable
ALTER TABLE "BoxCampaign" ADD COLUMN     "translations" JSONB;

-- AlterTable
ALTER TABLE "CMSPage" ADD COLUMN     "translations" JSONB;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "translations" JSONB;

-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "translations" JSONB;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "translations" JSONB;
