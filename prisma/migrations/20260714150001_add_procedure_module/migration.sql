-- CreateEnum
CREATE TYPE "procedure_order_statuses" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "balance_tx_sources" ADD VALUE 'PROCEDURE_SERVICE';

-- AlterEnum
ALTER TYPE "invoice_item_source_types" ADD VALUE 'PROCEDURE_SERVICE';

-- AlterEnum
ALTER TYPE "invoice_source_types" ADD VALUE 'PROCEDURE_ORDER';

-- CreateTable
CREATE TABLE "procedures" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(15,2),
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_orders" (
    "id" TEXT NOT NULL,
    "status" "procedure_order_statuses" NOT NULL DEFAULT 'PENDING',
    "caseStepId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "doctorId" TEXT,
    "price" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "procedure_orders_caseStepId_key" ON "procedure_orders"("caseStepId");

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_orders" ADD CONSTRAINT "procedure_orders_caseStepId_fkey" FOREIGN KEY ("caseStepId") REFERENCES "case_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_orders" ADD CONSTRAINT "procedure_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_orders" ADD CONSTRAINT "procedure_orders_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_orders" ADD CONSTRAINT "procedure_orders_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
