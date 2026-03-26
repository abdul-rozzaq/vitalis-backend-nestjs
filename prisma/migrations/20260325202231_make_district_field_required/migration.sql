/*
  Warnings:

  - Made the column `districtId` on table `patients` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "patients" DROP CONSTRAINT "patients_districtId_fkey";

-- AlterTable
ALTER TABLE "patients" ALTER COLUMN "districtId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
