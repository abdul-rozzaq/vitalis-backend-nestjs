-- DropForeignKey
ALTER TABLE "laboratory_assignments" DROP CONSTRAINT "laboratory_assignments_laboratoryId_fkey";

-- AddForeignKey
ALTER TABLE "laboratory_assignments" ADD CONSTRAINT "laboratory_assignments_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
