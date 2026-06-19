-- ─── 1. user_roles enum ga DIAGNOST qo'shish ────────────────────────────────
ALTER TYPE "user_roles" ADD VALUE 'DIAGNOST';

-- ─── 2. case_step_types enum ga DIAGNOSTIC qo'shish ─────────────────────────
ALTER TYPE "case_step_types" ADD VALUE 'DIAGNOSTIC';

-- ─── 3. invoice_source_types enum ga DIAGNOSTIC_ORDER qo'shish ───────────────
ALTER TYPE "invoice_source_types" ADD VALUE 'DIAGNOSTIC_ORDER';

-- ─── 4. invoice_item_source_types enum ga DIAGNOSTIC_SERVICE qo'shish ────────
ALTER TYPE "invoice_item_source_types" ADD VALUE 'DIAGNOSTIC_SERVICE';

-- ─── 5. Yangi enum'lar ────────────────────────────────────────────────────────
CREATE TYPE "diagnostic_order_statuses" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "diagnostic_item_statuses" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'READY',
  'DELIVERED',
  'CANCELLED'
);

-- ─── 6. diagnostics table ─────────────────────────────────────────────────────
CREATE TABLE "diagnostics" (
    "id"          TEXT           NOT NULL,
    "name"        VARCHAR(64)    NOT NULL,
    "description" TEXT,
    "createdAt"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "diagnostics_pkey" PRIMARY KEY ("id")
);

-- ─── 7. diagnostic_services table ────────────────────────────────────────────
CREATE TABLE "diagnostic_services" (
    "id"            TEXT          NOT NULL,
    "name"          VARCHAR(64)   NOT NULL,
    "price"         DOUBLE PRECISION,
    "diagnosticsId" TEXT          NOT NULL,
    "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "diagnostic_services_pkey" PRIMARY KEY ("id")
);

-- ─── 8. diagnostic_orders table ───────────────────────────────────────────────
CREATE TABLE "diagnostic_orders" (
    "id"            TEXT                         NOT NULL,
    "status"        "diagnostic_order_statuses"  NOT NULL DEFAULT 'PENDING',
    "caseStepId"    TEXT                         NOT NULL,
    "patientId"     TEXT                         NOT NULL,
    "diagnosticsId" TEXT                         NOT NULL,
    "createdAt"     TIMESTAMP(3)                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)                 NOT NULL,

    CONSTRAINT "diagnostic_orders_pkey" PRIMARY KEY ("id")
);

-- ─── 9. diagnostic_order_items table ─────────────────────────────────────────
CREATE TABLE "diagnostic_order_items" (
    "id"                TEXT                        NOT NULL,
    "status"            "diagnostic_item_statuses"  NOT NULL DEFAULT 'PENDING',
    "diagnosticOrderId" TEXT                        NOT NULL,
    "serviceId"         TEXT                        NOT NULL,
    "note"              TEXT,
    "completedAt"       TIMESTAMP(3),
    "startedAt"         TIMESTAMP(3),
    "readyAt"           TIMESTAMP(3),
    "deliveredAt"       TIMESTAMP(3),
    "cancelledAt"       TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)                NOT NULL,

    CONSTRAINT "diagnostic_order_items_pkey" PRIMARY KEY ("id")
);

-- ─── 10. diagnostic_order_item_files table ────────────────────────────────────
CREATE TABLE "diagnostic_order_item_files" (
    "id"                    TEXT          NOT NULL,
    "url"                   TEXT          NOT NULL,
    "name"                  TEXT          NOT NULL,
    "diagnosticOrderItemId" TEXT          NOT NULL,
    "createdAt"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_order_item_files_pkey" PRIMARY KEY ("id")
);

-- ─── 11. diagnostic_assignments table ────────────────────────────────────────
CREATE TABLE "diagnostic_assignments" (
    "id"            TEXT          NOT NULL,
    "userId"        TEXT          NOT NULL,
    "diagnosticsId" TEXT          NOT NULL,
    "isActive"      BOOLEAN       NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_assignments_pkey" PRIMARY KEY ("id")
);

-- ─── 12. Unique indexes ───────────────────────────────────────────────────────
CREATE UNIQUE INDEX "diagnostic_orders_caseStepId_key"
    ON "diagnostic_orders"("caseStepId");

CREATE UNIQUE INDEX "diagnostic_assignments_userId_diagnosticsId_key"
    ON "diagnostic_assignments"("userId", "diagnosticsId");

-- ─── 13. Foreign keys ─────────────────────────────────────────────────────────
ALTER TABLE "diagnostic_services"
    ADD CONSTRAINT "diagnostic_services_diagnosticsId_fkey"
    FOREIGN KEY ("diagnosticsId") REFERENCES "diagnostics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "diagnostic_orders"
    ADD CONSTRAINT "diagnostic_orders_caseStepId_fkey"
    FOREIGN KEY ("caseStepId") REFERENCES "case_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "diagnostic_orders"
    ADD CONSTRAINT "diagnostic_orders_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "diagnostic_orders"
    ADD CONSTRAINT "diagnostic_orders_diagnosticsId_fkey"
    FOREIGN KEY ("diagnosticsId") REFERENCES "diagnostics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "diagnostic_order_items"
    ADD CONSTRAINT "diagnostic_order_items_diagnosticOrderId_fkey"
    FOREIGN KEY ("diagnosticOrderId") REFERENCES "diagnostic_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "diagnostic_order_items"
    ADD CONSTRAINT "diagnostic_order_items_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "diagnostic_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "diagnostic_order_item_files"
    ADD CONSTRAINT "diagnostic_order_item_files_diagnosticOrderItemId_fkey"
    FOREIGN KEY ("diagnosticOrderItemId") REFERENCES "diagnostic_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "diagnostic_assignments"
    ADD CONSTRAINT "diagnostic_assignments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "diagnostic_assignments"
    ADD CONSTRAINT "diagnostic_assignments_diagnosticsId_fkey"
    FOREIGN KEY ("diagnosticsId") REFERENCES "diagnostics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
