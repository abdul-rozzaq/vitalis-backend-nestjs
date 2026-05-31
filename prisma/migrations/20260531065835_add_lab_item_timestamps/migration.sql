/*
  Warnings:

  - The values [DONE] on the enum `lab_item_statuses` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "lab_item_statuses_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED');
ALTER TABLE "public"."lab_order_items" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "lab_order_items" ALTER COLUMN "status" TYPE "lab_item_statuses_new" USING ("status"::text::"lab_item_statuses_new");
ALTER TYPE "lab_item_statuses" RENAME TO "lab_item_statuses_old";
ALTER TYPE "lab_item_statuses_new" RENAME TO "lab_item_statuses";
DROP TYPE "public"."lab_item_statuses_old";
ALTER TABLE "lab_order_items" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "lab_order_items" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);
