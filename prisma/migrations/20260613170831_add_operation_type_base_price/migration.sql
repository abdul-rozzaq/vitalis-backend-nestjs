-- CreateEnum
CREATE TYPE "operation_statuses" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "surgeon_roles" AS ENUM ('LEAD', 'ASSISTANT');

-- AlterEnum
ALTER TYPE "case_step_types" ADD VALUE 'OPERATION';

-- AlterEnum
ALTER TYPE "invoice_item_source_types" ADD VALUE 'OPERATION';

-- AlterEnum
ALTER TYPE "invoice_source_types" ADD VALUE 'OPERATION';

-- AlterEnum
ALTER TYPE "room_types" ADD VALUE 'OPERATION';

-- CreateTable
CREATE TABLE "operation_types" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operation_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_type_items" (
    "id" TEXT NOT NULL,
    "operationTypeId" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operation_type_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations" (
    "id" TEXT NOT NULL,
    "status" "operation_statuses" NOT NULL DEFAULT 'SCHEDULED',
    "patientId" TEXT NOT NULL,
    "operationTypeId" TEXT NOT NULL,
    "roomId" TEXT,
    "caseStepId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "totalPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_surgeons" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "surgeonId" TEXT NOT NULL,
    "role" "surgeon_roles" NOT NULL DEFAULT 'ASSISTANT',

    CONSTRAINT "operation_surgeons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_items" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "operationTypeItemId" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operations_caseStepId_key" ON "operations"("caseStepId");

-- CreateIndex
CREATE UNIQUE INDEX "operation_surgeons_operationId_surgeonId_key" ON "operation_surgeons"("operationId", "surgeonId");

-- AddForeignKey
ALTER TABLE "operation_type_items" ADD CONSTRAINT "operation_type_items_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "operation_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "operation_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_caseStepId_fkey" FOREIGN KEY ("caseStepId") REFERENCES "case_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_surgeons" ADD CONSTRAINT "operation_surgeons_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_surgeons" ADD CONSTRAINT "operation_surgeons_surgeonId_fkey" FOREIGN KEY ("surgeonId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_items" ADD CONSTRAINT "operation_items_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_items" ADD CONSTRAINT "operation_items_operationTypeItemId_fkey" FOREIGN KEY ("operationTypeItemId") REFERENCES "operation_type_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
