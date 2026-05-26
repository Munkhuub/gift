-- CreateEnum
CREATE TYPE "MerchCategory" AS ENUM ('PEN', 'NOTEBOOK', 'STICKER', 'STUFFED_TOY', 'GIFT_SET', 'OTHER');

-- DropTable
DROP TABLE "marketing_resources";

-- DropEnum
DROP TYPE "MarketingResourceStatus";

-- DropEnum
DROP TYPE "MarketingResourceType";

-- CreateTable
CREATE TABLE "marketing_merch_items" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MerchCategory" NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "issuedStock" INTEGER NOT NULL DEFAULT 0,
    "storageLocation" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_merch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_merch_issues" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "recipientName" TEXT NOT NULL DEFAULT '',
    "purpose" TEXT NOT NULL DEFAULT '',
    "issuedBy" TEXT NOT NULL DEFAULT '',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "marketing_merch_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_merch_items_category_idx" ON "marketing_merch_items"("category");

-- CreateIndex
CREATE INDEX "marketing_merch_issues_itemId_idx" ON "marketing_merch_issues"("itemId");

-- CreateIndex
CREATE INDEX "marketing_merch_issues_issuedAt_idx" ON "marketing_merch_issues"("issuedAt");

-- AddForeignKey
ALTER TABLE "marketing_merch_issues" ADD CONSTRAINT "marketing_merch_issues_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "marketing_merch_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
