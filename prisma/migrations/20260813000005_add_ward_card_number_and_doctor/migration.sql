ALTER TABLE "wards" ADD COLUMN "cardNumber" INTEGER;
ALTER TABLE "wards" ADD COLUMN "doctorId" TEXT;

ALTER TABLE "wards"
  ADD CONSTRAINT "wards_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "wards_doctorId_idx" ON "wards"("doctorId");
