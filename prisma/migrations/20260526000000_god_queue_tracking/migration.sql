-- CreateEnum
CREATE TYPE "GiftEligibilityStatus" AS ENUM ('PENDING', 'DELIVERED', 'REVIEW', 'CLOSED');

-- AlterTable
ALTER TABLE "clients"
ADD COLUMN "previousTier" "Tier",
ADD COLUMN "giftStillOwed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "giftEligibilityStatus" "GiftEligibilityStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "loanOverdueDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isWaitlist" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "tierChangedAt" TIMESTAMP(3),
ADD COLUMN "statusReason" TEXT NOT NULL DEFAULT '';

-- Backfill
UPDATE "clients"
SET
  "giftStillOwed" = NOT "giftDone",
  "giftEligibilityStatus" = CASE
    WHEN "giftDone" THEN 'DELIVERED'::"GiftEligibilityStatus"
    ELSE 'PENDING'::"GiftEligibilityStatus"
  END;
