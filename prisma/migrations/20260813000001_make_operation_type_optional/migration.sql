-- AlterTable
ALTER TABLE "operations" ALTER COLUMN "operationTypeId" DROP NOT NULL;

-- Add index back if it was there
CREATE INDEX "operations_operationTypeId_idx" ON "operations"("operationTypeId");
