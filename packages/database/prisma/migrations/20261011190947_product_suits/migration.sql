-- CreateEnum
CREATE TYPE "LifeStage" AS ENUM ('PUPPY', 'ADULT', 'SENIOR');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "dogSizes" "DogSize"[] DEFAULT ARRAY[]::"DogSize"[],
ADD COLUMN     "goodFor" TEXT,
ADD COLUMN     "lifeStages" "LifeStage"[] DEFAULT ARRAY[]::"LifeStage"[];
