
ALTER TABLE "operations" DROP CONSTRAINT "operations_operationTypeId_fkey";

ALTER TABLE "patients" DROP CONSTRAINT "patients_districtId_fkey";

DROP INDEX "operations_operationTypeId_idx";

DROP INDEX "patients_districtId_idx";

DROP INDEX "wards_doctorId_idx";

ALTER TABLE "shift_staff" ALTER COLUMN "role" TYPE TEXT USING ("role"::TEXT);
UPDATE "shift_staff" SET "role" = 'HAMSHIRA' WHERE "role" = 'NURSE';
ALTER TABLE "shift_staff" ALTER COLUMN "role" TYPE "user_roles" USING ("role"::"user_roles");

DROP TYPE "shift_staff_roles";

ALTER TABLE "operations" ADD CONSTRAINT "operations_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "operation_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "patients" ADD CONSTRAINT "patients_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
