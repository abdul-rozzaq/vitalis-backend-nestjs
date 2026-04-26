-- DropForeignKey
ALTER TABLE "lab_orders" DROP CONSTRAINT "lab_orders_laboratoryId_fkey";

-- CreateTable
CREATE TABLE "lab_order_item_files" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "labOrderItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_order_item_files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_item_files" ADD CONSTRAINT "lab_order_item_files_labOrderItemId_fkey" FOREIGN KEY ("labOrderItemId") REFERENCES "lab_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
