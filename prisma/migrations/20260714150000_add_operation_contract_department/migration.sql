-- AlterTable
ALTER TABLE "operations" ADD COLUMN "contractNumber" VARCHAR(64),
ADD COLUMN "departmentId" TEXT;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
