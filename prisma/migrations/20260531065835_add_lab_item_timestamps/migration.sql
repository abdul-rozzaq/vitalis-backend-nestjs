BEGIN;

-- 1. Avval YANGI enum yarat
CREATE TYPE "lab_item_statuses_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED');

-- 2. Default'ni olib tashla
ALTER TABLE "public"."lab_order_items" ALTER COLUMN "status" DROP DEFAULT;

-- 3. Kolonnani yangi type'ga o'tkazish (DONE -> READY map qilib)
ALTER TABLE "lab_order_items" 
  ALTER COLUMN "status" TYPE "lab_item_statuses_new" 
  USING (
    CASE "status"::text
      WHEN 'DONE' THEN 'READY'
      ELSE "status"::text
    END
  )::"lab_item_statuses_new";

-- 4. Eski enum'ni o'chir
ALTER TYPE "lab_item_statuses" RENAME TO "lab_item_statuses_old";
ALTER TYPE "lab_item_statuses_new" RENAME TO "lab_item_statuses";
DROP TYPE "public"."lab_item_statuses_old";

-- 5. Default qaytarib qo'y
ALTER TABLE "lab_order_items" ALTER COLUMN "status" SET DEFAULT 'PENDING';

COMMIT;

-- AlterTable
ALTER TABLE "lab_order_items" 
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "readyAt" TIMESTAMP(3),
ADD COLUMN "startedAt" TIMESTAMP(3);