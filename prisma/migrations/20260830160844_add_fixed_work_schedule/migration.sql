-- CreateEnum
CREATE TYPE "work_types" AS ENUM ('SMENA', 'FIXED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "workType" "work_types" NOT NULL DEFAULT 'SMENA';

-- CreateTable
CREATE TABLE "fixed_work_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "daysOfWeek" INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fixed_work_schedules_userId_key" ON "fixed_work_schedules"("userId");

-- CreateIndex
CREATE INDEX "fixed_work_schedules_departmentId_isActive_idx" ON "fixed_work_schedules"("departmentId", "isActive");

-- AddForeignKey
ALTER TABLE "fixed_work_schedules" ADD CONSTRAINT "fixed_work_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_work_schedules" ADD CONSTRAINT "fixed_work_schedules_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
