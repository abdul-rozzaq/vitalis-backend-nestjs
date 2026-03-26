/*
  Warnings:

  - Made the column `birth_date` on table `patients` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "patients" ALTER COLUMN "birth_date" SET NOT NULL;
