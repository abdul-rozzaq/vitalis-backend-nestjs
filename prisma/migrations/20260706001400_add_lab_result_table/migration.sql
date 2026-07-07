-- CreateTable
CREATE TABLE "lab_result_tables" (
    "id" TEXT NOT NULL,
    "labOrderItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_result_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_result_rows" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "norm" TEXT,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_result_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lab_result_tables_labOrderItemId_key" ON "lab_result_tables"("labOrderItemId");

-- AddForeignKey
ALTER TABLE "lab_result_tables" ADD CONSTRAINT "lab_result_tables_labOrderItemId_fkey" FOREIGN KEY ("labOrderItemId") REFERENCES "lab_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_result_rows" ADD CONSTRAINT "lab_result_rows_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "lab_result_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
