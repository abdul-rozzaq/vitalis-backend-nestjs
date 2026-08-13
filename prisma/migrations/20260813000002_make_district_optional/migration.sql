-- AlterTable
ALTER TABLE "patients" ALTER COLUMN "districtId" DROP NOT NULL;

-- Add index back if it was there
CREATE INDEX "patients_districtId_idx" ON "patients"("districtId");
