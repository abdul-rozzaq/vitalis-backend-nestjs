ALTER TABLE "operations" ADD COLUMN "basePrice" DECIMAL(15,2) NOT NULL DEFAULT 0;

UPDATE "operations" o
SET "basePrice" = ot."basePrice"
FROM "operation_types" ot
WHERE o."operationTypeId" = ot.id
  AND o."basePrice" = 0;
