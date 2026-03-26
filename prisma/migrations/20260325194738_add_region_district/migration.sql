-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "districtId" TEXT;

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "regionId" TEXT NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
