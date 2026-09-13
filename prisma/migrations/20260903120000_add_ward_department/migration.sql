-- AlterTable
ALTER TABLE "wards" ADD COLUMN     "departmentId" TEXT;

-- CreateIndex
CREATE INDEX "wards_departmentId_idx" ON "wards"("departmentId");

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
