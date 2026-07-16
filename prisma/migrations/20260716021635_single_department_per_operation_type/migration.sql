/*
  Warnings:

  - You are about to drop the `operation_type_departments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "operation_type_departments" DROP CONSTRAINT "operation_type_departments_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "operation_type_departments" DROP CONSTRAINT "operation_type_departments_operationTypeId_fkey";

-- AlterTable
ALTER TABLE "operation_types" ADD COLUMN     "departmentId" TEXT;

-- DropTable
DROP TABLE "operation_type_departments";

-- AddForeignKey
ALTER TABLE "operation_types" ADD CONSTRAINT "operation_types_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
