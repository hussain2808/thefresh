/*
  Warnings:

  - Added the required column `totalFils` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "totalFils" INTEGER NOT NULL,
ALTER COLUMN "subtotalFils" DROP DEFAULT;
