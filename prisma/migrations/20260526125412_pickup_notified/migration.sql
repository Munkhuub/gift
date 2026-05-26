-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "pickupCenter" TEXT NOT NULL DEFAULT 'Мөнгөн Завьяа зээлийн төв',
ADD COLUMN     "pickupNotified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pickupNotifiedAt" TIMESTAMP(3);
