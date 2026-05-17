-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('GOD', 'KING', 'BOSS', 'STAR', 'FAN');

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneMasked" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'FAN',
    "giftDone" BOOLEAN NOT NULL DEFAULT false,
    "giftDate" TIMESTAMP(3),
    "hasLoan" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_logs" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "giftType" TEXT NOT NULL,
    "deliveredBy" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_phoneMasked_key" ON "clients"("phoneMasked");

-- CreateIndex
CREATE INDEX "gift_logs_clientId_idx" ON "gift_logs"("clientId");

-- AddForeignKey
ALTER TABLE "gift_logs" ADD CONSTRAINT "gift_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
