-- AlterEnum
ALTER TYPE "bonus_tx_sources" ADD VALUE 'ACCOMMODATION';

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "companion_daily_price" DECIMAL(15,2),
ADD COLUMN     "patient_daily_price" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "wards" ADD COLUMN     "companion_price_per_day" DECIMAL(15,2),
ADD COLUMN     "patient_price_per_day" DECIMAL(15,2);
