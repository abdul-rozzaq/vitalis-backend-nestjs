-- CreateTable
CREATE TABLE "operation_type_departments" (
    "id" TEXT NOT NULL,
    "operationTypeId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_type_departments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operation_type_departments_operationTypeId_departmentId_key" ON "operation_type_departments"("operationTypeId", "departmentId");

-- AddForeignKey
ALTER TABLE "operation_type_departments" ADD CONSTRAINT "operation_type_departments_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "operation_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_type_departments" ADD CONSTRAINT "operation_type_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
