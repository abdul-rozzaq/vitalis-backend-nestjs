ALTER TABLE "operations" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "operations" ADD COLUMN "contractNumber" TEXT;

ALTER TABLE "operations" ADD CONSTRAINT "operations_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "operations" o
SET "departmentId" = r."departmentId"
FROM "rooms" r
WHERE o."roomId" = r.id
  AND o."departmentId" IS NULL
  AND r."departmentId" IS NOT NULL;
