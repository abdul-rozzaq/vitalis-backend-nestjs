-- CreateEnum
CREATE TYPE "case_billing_modes" AS ENUM ('PER_SERVICE', 'MASTER');

-- AlterEnum
ALTER TYPE "invoice_source_types" ADD VALUE 'CASE';

-- AlterTable
ALTER TABLE "patient_cases" ADD COLUMN     "billingMode" "case_billing_modes" NOT NULL DEFAULT 'PER_SERVICE';

-- Ensure at most one active Master Invoice per case (race-condition guard).
-- "Active" = not yet cancelled or fully paid; sourceId holds the PatientCase.id
-- for sourceType = 'CASE' (see cases.service.ts convert-to-master flow).
CREATE UNIQUE INDEX "invoices_one_active_master_per_case"
  ON "invoices" ("sourceId")
  WHERE "sourceType" = 'CASE' AND "status" IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID');
