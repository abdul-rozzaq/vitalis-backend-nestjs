/*
  Warnings:

  - You are about to drop the column `contractNumber` on the `operations` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `operations` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "operations" DROP CONSTRAINT IF EXISTS "operations_departmentId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "lab_orders_caseStepId_key";

-- AlterTable
ALTER TABLE "operations"
  DROP COLUMN IF EXISTS "contractNumber",
  DROP COLUMN IF EXISTS "departmentId";
