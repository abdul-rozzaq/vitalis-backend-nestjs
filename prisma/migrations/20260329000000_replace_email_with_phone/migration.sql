-- Migrate email → phone as unique login identifier
-- Fill NULL phones with email value so NOT NULL constraint passes
UPDATE "users" SET "phone" = "email" WHERE "phone" IS NULL;

-- Drop email unique index and column
DROP INDEX IF EXISTS "users_email_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "email";

-- Make phone NOT NULL and unique
ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");
