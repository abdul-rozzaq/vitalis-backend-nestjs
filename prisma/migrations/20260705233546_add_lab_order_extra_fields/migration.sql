-- AlterTable: LaboratoryService - default result-row template
ALTER TABLE "laboratory_services" ADD COLUMN "defaultRows" JSONB;

-- AlterTable: LabOrder - order number / sample taken date
ALTER TABLE "lab_orders" ADD COLUMN "orderNumber" TEXT;
ALTER TABLE "lab_orders" ADD COLUMN "sampleTakenAt" TIMESTAMP(3);

-- AlterTable: LabOrderItem - who entered/confirmed the result
ALTER TABLE "lab_order_items" ADD COLUMN "performedById" TEXT;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
