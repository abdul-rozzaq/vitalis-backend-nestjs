-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "attendance_record_statuses" ADD VALUE 'MISSING_CHECKOUT';
ALTER TYPE "attendance_record_statuses" ADD VALUE 'MISSING_CHECKIN';

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "absentMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "workedMinutes" INTEGER NOT NULL DEFAULT 0;
