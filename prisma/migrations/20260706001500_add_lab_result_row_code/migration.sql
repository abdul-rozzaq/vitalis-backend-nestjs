-- AlterTable: LabResultRow - short indicator code (e.g. WBC, RBC, HGB)
ALTER TABLE "lab_result_rows" ADD COLUMN "code" TEXT;
