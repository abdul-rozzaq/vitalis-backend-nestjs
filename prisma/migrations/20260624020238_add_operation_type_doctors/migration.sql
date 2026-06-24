-- CreateTable
CREATE TABLE "operation_type_doctors" (
    "id" TEXT NOT NULL,
    "operationTypeId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_type_doctors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operation_type_doctors_operationTypeId_doctorId_key" ON "operation_type_doctors"("operationTypeId", "doctorId");

-- AddForeignKey
ALTER TABLE "operation_type_doctors" ADD CONSTRAINT "operation_type_doctors_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "operation_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_type_doctors" ADD CONSTRAINT "operation_type_doctors_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
