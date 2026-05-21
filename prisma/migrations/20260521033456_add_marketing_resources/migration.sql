-- CreateEnum
CREATE TYPE "MarketingResourceType" AS ENUM ('MERCH', 'CREATIVE', 'BUDGET', 'STAFF', 'CHANNEL');

-- CreateEnum
CREATE TYPE "MarketingResourceStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'READY', 'DEPLOYED');

-- CreateTable
CREATE TABLE "marketing_resources" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "campaign" TEXT NOT NULL DEFAULT '',
    "resourceType" "MarketingResourceType" NOT NULL,
    "owner" TEXT NOT NULL DEFAULT '',
    "status" "MarketingResourceStatus" NOT NULL DEFAULT 'REQUESTED',
    "quantity" INTEGER,
    "budget" DOUBLE PRECISION,
    "neededBy" TIMESTAMP(3),
    "vendor" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_resources_status_idx" ON "marketing_resources"("status");

-- CreateIndex
CREATE INDEX "marketing_resources_resourceType_idx" ON "marketing_resources"("resourceType");

-- CreateIndex
CREATE INDEX "marketing_resources_neededBy_idx" ON "marketing_resources"("neededBy");
