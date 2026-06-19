-- DropForeignKey
ALTER TABLE "diagnostic_assignments" DROP CONSTRAINT "diagnostic_assignments_diagnosticsId_fkey";

-- AddForeignKey
ALTER TABLE "diagnostic_assignments" ADD CONSTRAINT "diagnostic_assignments_diagnosticsId_fkey" FOREIGN KEY ("diagnosticsId") REFERENCES "diagnostics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
