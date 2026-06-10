/*
  Warnings:

  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "patient_conditions" AS ENUM ('STABLE', 'IMPROVING', 'WORSENING', 'CRITICAL');

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_labOrderItemId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_laboratoryServiceId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_patientId_fkey";

-- DropTable
DROP TABLE "payments";

-- DropEnum
DROP TYPE "payment_methods";

-- DropEnum
DROP TYPE "payment_statuses";

-- CreateTable
CREATE TABLE "room_shifts" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "startHour" INTEGER NOT NULL,
    "endHour" INTEGER NOT NULL,
    "startDate" DATE,
    "endDate" DATE,
    "color" VARCHAR(7),
    "roundHour" INTEGER,
    "doctorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_rooms" (
    "id" TEXT NOT NULL,
    "roomShiftId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "shift_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_default_nurses" (
    "id" TEXT NOT NULL,
    "roomShiftId" TEXT NOT NULL,
    "nurseId" TEXT NOT NULL,

    CONSTRAINT "shift_default_nurses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" TEXT NOT NULL,
    "roomShiftId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "doctorId" TEXT NOT NULL,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_nurses" (
    "id" TEXT NOT NULL,
    "shiftAssignmentId" TEXT NOT NULL,
    "nurseId" TEXT NOT NULL,

    CONSTRAINT "shift_nurses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ward_rounds" (
    "id" TEXT NOT NULL,
    "shiftAssignmentId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ward_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ward_round_patients" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "condition" "patient_conditions" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ward_round_patients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shift_rooms_roomShiftId_roomId_key" ON "shift_rooms"("roomShiftId", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_default_nurses_roomShiftId_nurseId_key" ON "shift_default_nurses"("roomShiftId", "nurseId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_assignments_roomShiftId_roomId_date_key" ON "shift_assignments"("roomShiftId", "roomId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "shift_nurses_shiftAssignmentId_nurseId_key" ON "shift_nurses"("shiftAssignmentId", "nurseId");

-- AddForeignKey
ALTER TABLE "room_shifts" ADD CONSTRAINT "room_shifts_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_rooms" ADD CONSTRAINT "shift_rooms_roomShiftId_fkey" FOREIGN KEY ("roomShiftId") REFERENCES "room_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_rooms" ADD CONSTRAINT "shift_rooms_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_default_nurses" ADD CONSTRAINT "shift_default_nurses_roomShiftId_fkey" FOREIGN KEY ("roomShiftId") REFERENCES "room_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_default_nurses" ADD CONSTRAINT "shift_default_nurses_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_roomShiftId_fkey" FOREIGN KEY ("roomShiftId") REFERENCES "room_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_nurses" ADD CONSTRAINT "shift_nurses_shiftAssignmentId_fkey" FOREIGN KEY ("shiftAssignmentId") REFERENCES "shift_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_nurses" ADD CONSTRAINT "shift_nurses_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_rounds" ADD CONSTRAINT "ward_rounds_shiftAssignmentId_fkey" FOREIGN KEY ("shiftAssignmentId") REFERENCES "shift_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_round_patients" ADD CONSTRAINT "ward_round_patients_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ward_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ward_round_patients" ADD CONSTRAINT "ward_round_patients_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
