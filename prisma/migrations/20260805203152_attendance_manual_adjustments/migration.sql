-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "manualCheckInAt" TIMESTAMP(3),
ADD COLUMN     "manualCheckOutAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "attendance_adjustments" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "field" VARCHAR(20) NOT NULL,
    "oldValue" TIMESTAMP(3),
    "newValue" TIMESTAMP(3),
    "reason" VARCHAR(500) NOT NULL,
    "adjustedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_adjustments_recordId_idx" ON "attendance_adjustments"("recordId");

-- AddForeignKey
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_adjustedBy_fkey" FOREIGN KEY ("adjustedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
