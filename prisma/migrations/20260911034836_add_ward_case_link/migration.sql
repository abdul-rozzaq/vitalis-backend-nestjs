-- AlterTable
ALTER TABLE "wards" ADD COLUMN     "caseId" TEXT;

-- CreateIndex
CREATE INDEX "wards_caseId_idx" ON "wards"("caseId");

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "patient_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
