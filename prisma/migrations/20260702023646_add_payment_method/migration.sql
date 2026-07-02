-- CreateEnum
CREATE TYPE "payment_methods" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');

-- AlterTable
ALTER TABLE "balance_transactions" ADD COLUMN     "paymentMethod" "payment_methods";
