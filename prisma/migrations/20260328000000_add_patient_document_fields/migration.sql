-- CreateEnum
CREATE TYPE "document_types" AS ENUM ('PASSPORT', 'BIRTH_CERTIFICATE', 'FOREIGN_PASSPORT', 'RESIDENCE_PERMIT');

-- AlterTable
ALTER TABLE "patients"
  ADD COLUMN "document_type"   "document_types",
  ADD COLUMN "document_series" VARCHAR(10),
  ADD COLUMN "document_number" VARCHAR(20),
  ADD COLUMN "pinfl"           VARCHAR(14);

-- CreateIndex
CREATE UNIQUE INDEX "patients_pinfl_key" ON "patients"("pinfl");
