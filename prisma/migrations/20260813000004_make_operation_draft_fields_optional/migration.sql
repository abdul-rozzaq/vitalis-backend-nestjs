-- Allow operations to be created as drafts with only a patient selected.
ALTER TABLE "operations"
  ALTER COLUMN "scheduledAt" DROP NOT NULL;
