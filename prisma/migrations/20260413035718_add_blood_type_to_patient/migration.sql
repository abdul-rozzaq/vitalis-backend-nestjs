-- CreateEnum
CREATE TYPE "blood_types" AS ENUM ('O_POSITIVE', 'O_NEGATIVE', 'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "blood_type" "blood_types" DEFAULT 'O_POSITIVE';
