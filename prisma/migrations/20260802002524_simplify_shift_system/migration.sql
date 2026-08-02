-- Shift tizimini soddalashtirish: uch avlod modeldan bittasiga o'tish.
--
-- Olib tashlanadi:
--   * work_schedules / work_schedule_versions  — hech qachon ishlatilmagan
--   * staff_availabilities / staff_time_offs   — kodda 0 ta referens
--   * shift_assignments / shift_requirements / staff_roles
--       -> shift_staff (DOCTOR|NURSE enum) va shifts.requiredDoctors/requiredNurses
--          bilan bir xil ma'lumotni takrorlagan
--   * shift_template_requirements -> shift_templates ichidagi skalyar ustunlar
--
-- BACKFILL KERAK EMAS: migratsiya yozilgan paytda barcha shift jadvallari bo'sh
-- edi (shifts=0, shift_staff=0, shift_assignments=0, attendance_records=0).
-- Agar bu migratsiya ma'lumoti bor bazaga qo'llanilsa, avval shift_assignments
-- dan shift_staff ga backfill qilish shart.

-- DropForeignKey
ALTER TABLE "attendance_records" DROP CONSTRAINT "attendance_records_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "shift_assignments" DROP CONSTRAINT "shift_assignments_roleId_fkey";

-- DropForeignKey
ALTER TABLE "shift_assignments" DROP CONSTRAINT "shift_assignments_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "shift_assignments" DROP CONSTRAINT "shift_assignments_userId_fkey";

-- DropForeignKey
ALTER TABLE "shift_requirements" DROP CONSTRAINT "shift_requirements_roleId_fkey";

-- DropForeignKey
ALTER TABLE "shift_requirements" DROP CONSTRAINT "shift_requirements_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "shift_template_requirements" DROP CONSTRAINT "shift_template_requirements_roleId_fkey";

-- DropForeignKey
ALTER TABLE "shift_template_requirements" DROP CONSTRAINT "shift_template_requirements_templateId_fkey";

-- DropForeignKey
ALTER TABLE "shift_templates" DROP CONSTRAINT "shift_templates_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_workScheduleId_fkey";

-- DropForeignKey
ALTER TABLE "staff_availabilities" DROP CONSTRAINT "staff_availabilities_userId_fkey";

-- DropForeignKey
ALTER TABLE "staff_time_offs" DROP CONSTRAINT "staff_time_offs_userId_fkey";

-- DropForeignKey
ALTER TABLE "work_schedule_versions" DROP CONSTRAINT "work_schedule_versions_publishedById_fkey";

-- DropForeignKey
ALTER TABLE "work_schedule_versions" DROP CONSTRAINT "work_schedule_versions_workScheduleId_fkey";

-- DropForeignKey
ALTER TABLE "work_schedules" DROP CONSTRAINT "work_schedules_createdById_fkey";

-- DropForeignKey
ALTER TABLE "work_schedules" DROP CONSTRAINT "work_schedules_departmentId_fkey";

-- AlterTable
ALTER TABLE "shift_templates" ADD COLUMN     "daysOfWeek" INTEGER[],
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requiredDoctors" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "requiredNurses" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "departmentId" SET NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "startTime" SET DATA TYPE VARCHAR(5),
ALTER COLUMN "endTime" SET DATA TYPE VARCHAR(5);

-- AlterTable
ALTER TABLE "shifts" DROP COLUMN "workScheduleId";

-- DropTable
DROP TABLE "shift_assignments";

-- DropTable
DROP TABLE "shift_requirements";

-- DropTable
DROP TABLE "shift_template_requirements";

-- DropTable
DROP TABLE "staff_availabilities";

-- DropTable
DROP TABLE "staff_roles";

-- DropTable
DROP TABLE "staff_time_offs";

-- DropTable
DROP TABLE "work_schedule_versions";

-- DropTable
DROP TABLE "work_schedules";

-- DropEnum
DROP TYPE "availability_types";

-- DropEnum
DROP TYPE "schedule_publish_statuses";

-- DropEnum
DROP TYPE "time_off_statuses";

-- CreateIndex
CREATE INDEX "shift_staff_userId_idx" ON "shift_staff"("userId");

-- CreateIndex
CREATE INDEX "shift_templates_departmentId_isActive_idx" ON "shift_templates"("departmentId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_departmentId_startAt_endAt_key" ON "shifts"("departmentId", "startAt", "endAt");

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

