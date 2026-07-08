-- CreateTable
CREATE TABLE "lab_result_templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "rows" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_result_templates_pkey" PRIMARY KEY ("id")
);
