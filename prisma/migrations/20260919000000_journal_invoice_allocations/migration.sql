BEGIN;
ALTER TABLE "invoices" ADD COLUMN "isJournal" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "journalId" TEXT;
ALTER TABLE "invoice_items" ADD COLUMN "journalItemId" TEXT;
DROP INDEX "invoices_one_active_master_per_case";

-- Keep draft journals and all existing invoice/payment IDs. Issued legacy
-- masters become child invoices; copy their services into the journal ledger.
UPDATE "invoices" SET "isJournal" = true
WHERE "sourceType" = 'CASE' AND "status" = 'DRAFT';

INSERT INTO "invoices" ("id", "patientId", "status", "totalAmount", "paidCash", "paidBonus",
  "sourceType", "sourceId", "createdAt", "updatedAt", "createdById", "isJournal")
SELECT 'journal-' || c."id", c."patientId", 'DRAFT', 0, 0, 0, 'CASE', c."id",
  c."openedAt", CURRENT_TIMESTAMP, origin."createdById", true
FROM "patient_cases" c
CROSS JOIN LATERAL (
  SELECT "createdById" FROM "invoices" WHERE "sourceType" = 'CASE' AND "sourceId" = c."id"
  ORDER BY "createdAt" DESC LIMIT 1
) origin
WHERE c."billingMode" = 'MASTER'
AND NOT EXISTS (SELECT 1 FROM "invoices" j WHERE j."sourceType" = 'CASE' AND j."sourceId" = c."id" AND j."isJournal");

UPDATE "invoices" i SET "journalId" = j."id"
FROM "invoices" j
WHERE j."isJournal" AND i."sourceType" = 'CASE' AND i."sourceId" = j."sourceId" AND NOT i."isJournal";

INSERT INTO "invoice_items" ("id", "invoiceId", "description", "quantity", "unitPrice", "totalPrice",
  "dateFrom", "dateTo", "sourceType", "sourceId", "createdAt")
SELECT 'journal-' || item."id", i."journalId", item."description", item."quantity", item."unitPrice",
  item."totalPrice", item."dateFrom", item."dateTo", item."sourceType", item."sourceId", item."createdAt"
FROM "invoice_items" item JOIN "invoices" i ON i."id" = item."invoiceId"
WHERE i."journalId" IS NOT NULL AND i."status" <> 'CANCELLED';

UPDATE "invoice_items" item SET "journalItemId" = 'journal-' || item."id"
FROM "invoices" i WHERE item."invoiceId" = i."id" AND i."journalId" IS NOT NULL AND i."status" <> 'CANCELLED';

UPDATE "invoices" j SET "totalAmount" = COALESCE((SELECT SUM("totalPrice") FROM "invoice_items" WHERE "invoiceId" = j."id"), 0)
WHERE j."isJournal";

CREATE INDEX "invoices_journalId_idx" ON "invoices" ("journalId");
CREATE INDEX "invoice_items_journalItemId_idx" ON "invoice_items" ("journalItemId");
CREATE UNIQUE INDEX "invoices_one_active_master_per_case" ON "invoices" ("sourceId")
WHERE "isJournal" = true AND "sourceType" = 'CASE' AND "status" <> 'CANCELLED';
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_journalId_fkey"
  FOREIGN KEY ("journalId") REFERENCES "invoices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_journalItemId_fkey"
  FOREIGN KEY ("journalItemId") REFERENCES "invoice_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
