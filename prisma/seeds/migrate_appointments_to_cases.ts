// @ts-nocheck
// Idempotent migration: wrap each existing Appointment in a PatientCase + CONSULTATION CaseStep.
// Safe to run multiple times — skips appointments that already have a CaseStep.

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const appointments = await prisma.appointment.findMany({
    include: { prescription: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${appointments.length} appointments to migrate.`);

  let created = 0;
  let skipped = 0;

  for (const appt of appointments) {
    // Skip if already migrated
    const existing = await prisma.caseStep.findUnique({
      where: { appointmentId: appt.id },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const patientCase = await tx.patientCase.create({
        data: {
          patientId: appt.patientId,
          status: "COMPLETED",
          openedAt: appt.createdAt,
          closedAt: appt.dateTime,
        },
      });

      // CHECKIN step
      await tx.caseStep.create({
        data: {
          caseId: patientCase.id,
          type: "CHECKIN",
          status: "DONE",
          completedAt: appt.createdAt,
        },
      });

      // CONSULTATION step linked to the appointment
      const step = await tx.caseStep.create({
        data: {
          caseId: patientCase.id,
          type: "CONSULTATION",
          status: "DONE",
          assignmentId: appt.assignmentId,
          appointmentId: appt.id,
          completedAt: appt.dateTime,
        },
      });

      // Link prescription to the case step if it exists
      if (appt.prescription) {
        await tx.prescription.update({
          where: { id: appt.prescription.id },
          data: { caseStepId: step.id },
        });
      }
    });

    created++;
  }

  console.log(`Migration complete. Created: ${created}, Skipped (already migrated): ${skipped}.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
