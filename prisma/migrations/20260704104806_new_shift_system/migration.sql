/*
  Warnings:

  - You are about to drop the column `shiftAssignmentId` on the `ward_rounds` table. All the data in the column will be lost.
  - You are about to drop the `room_shifts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shift_assignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shift_change_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shift_default_nurses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shift_notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shift_nurses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shift_rooms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `working_hours_log` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `shiftId` to the `ward_rounds` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "shift_statuses" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "shift_staff_roles" AS ENUM ('DOCTOR', 'NURSE');

-- DropForeignKey
ALTER TABLE "shift_assignments" DROP CONSTRAINT "shift_assignments_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "shift_assignments" DROP CONSTRAINT "shift_assignments_parentAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "shift_assignments" DROP CONSTRAINT "shift_assignments_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "shift_assignments" DROP CONSTRAINT "shift_assignments_roomId_fkey";

-- DropForeignKey
ALTER TABLE "shift_assignments" DROP CONSTRAINT "shift_assignments_roomShiftId_fkey";

-- DropForeignKey
ALTER TABLE "shift_assignments" DROP CONSTRAINT "shift_assignments_swappedWithId_fkey";

-- DropForeignKey
ALTER TABLE "shift_change_events" DROP CONSTRAINT "shift_change_events_fromDoctorId_fkey";

-- DropForeignKey
ALTER TABLE "shift_change_events" DROP CONSTRAINT "shift_change_events_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "shift_change_events" DROP CONSTRAINT "shift_change_events_roomShiftId_fkey";

-- DropForeignKey
ALTER TABLE "shift_change_events" DROP CONSTRAINT "shift_change_events_shiftAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "shift_change_events" DROP CONSTRAINT "shift_change_events_toDoctorId_fkey";

-- DropForeignKey
ALTER TABLE "shift_default_nurses" DROP CONSTRAINT "shift_default_nurses_nurseId_fkey";

-- DropForeignKey
ALTER TABLE "shift_default_nurses" DROP CONSTRAINT "shift_default_nurses_roomShiftId_fkey";

-- DropForeignKey
ALTER TABLE "shift_notifications" DROP CONSTRAINT "shift_notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "shift_nurses" DROP CONSTRAINT "shift_nurses_nurseId_fkey";

-- DropForeignKey
ALTER TABLE "shift_nurses" DROP CONSTRAINT "shift_nurses_shiftAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "shift_rooms" DROP CONSTRAINT "shift_rooms_roomId_fkey";

-- DropForeignKey
ALTER TABLE "shift_rooms" DROP CONSTRAINT "shift_rooms_roomShiftId_fkey";

-- DropForeignKey
ALTER TABLE "ward_rounds" DROP CONSTRAINT "ward_rounds_shiftAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "working_hours_log" DROP CONSTRAINT "working_hours_log_shiftAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "working_hours_log" DROP CONSTRAINT "working_hours_log_userId_fkey";

-- AlterTable
ALTER TABLE "ward_rounds" DROP COLUMN "shiftAssignmentId",
ADD COLUMN     "shiftId" TEXT NOT NULL;

-- DropTable
DROP TABLE "room_shifts";

-- DropTable
DROP TABLE "shift_assignments";

-- DropTable
DROP TABLE "shift_change_events";

-- DropTable
DROP TABLE "shift_default_nurses";

-- DropTable
DROP TABLE "shift_notifications";

-- DropTable
DROP TABLE "shift_nurses";

-- DropTable
DROP TABLE "shift_rooms";

-- DropTable
DROP TABLE "working_hours_log";

-- DropEnum
DROP TYPE "shift_event_types";

-- DropEnum
DROP TYPE "shift_notif_types";

-- DropEnum
DROP TYPE "shift_override_types";

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "requiredDoctors" INTEGER NOT NULL DEFAULT 1,
    "requiredNurses" INTEGER NOT NULL DEFAULT 1,
    "note" VARCHAR(500),
    "status" "shift_statuses" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_staff" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "shift_staff_roles" NOT NULL,

    CONSTRAINT "shift_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shifts_departmentId_startAt_idx" ON "shifts"("departmentId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "shift_staff_shiftId_userId_key" ON "shift_staff"("shiftId", "userId");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_staff" ADD CONSTRAINT "shift_staff_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_staff" ADD CONSTRAINT "shift_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_rounds" ADD CONSTRAINT "ward_rounds_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
