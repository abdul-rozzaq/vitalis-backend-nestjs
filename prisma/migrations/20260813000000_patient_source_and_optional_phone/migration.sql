-- AlterTable
ALTER TABLE "patients"
ALTER COLUMN "phone_number" DROP NOT NULL,
ADD COLUMN     "sourceId" TEXT;

-- CreateTable
CREATE TABLE "patient_sources" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_sources_name_key" ON "patient_sources"("name");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "patient_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
