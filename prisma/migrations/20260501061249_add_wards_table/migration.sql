-- CreateEnum
CREATE TYPE "ward_statuses" AS ENUM ('OCCUPIED', 'VACATED');

-- CreateTable
CREATE TABLE "wards" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "wardNumber" VARCHAR(20),
    "checkIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedOut" TIMESTAMP(3),
    "actualOut" TIMESTAMP(3),
    "daysStayed" INTEGER DEFAULT 0,
    "note" TEXT,
    "status" "ward_statuses" NOT NULL DEFAULT 'OCCUPIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
