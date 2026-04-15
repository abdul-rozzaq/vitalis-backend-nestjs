import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PrescriptionItemDto } from "./prescriptions.dto";

const prescriptionInclude = {
  items: {
    include: { medicine: true },
    orderBy: { medicine: { name: "asc" } },
  },
} as const;

const prescriptionPrintInclude = {
  appointment: {
    include: {
      patient: true,
      assignment: {
        include: {
          department: true,
          user: true,
        },
      },
    },
  },
  items: {
    include: { medicine: true },
    orderBy: { medicine: { name: "asc" } },
  },
} as const;

@Injectable()
export class PrescriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAppointmentId(appointmentId: string) {
    return this.prisma.prescription.findUnique({
      where: { appointmentId },
      include: prescriptionInclude,
    });
  }

  async upsert(appointmentId: string, items: PrescriptionItemDto[]) {
    return this.prisma.$transaction(async (tx) => {
      // Find or create the prescription
      const prescription = await tx.prescription.upsert({
        where: { appointmentId },
        create: { appointmentId },
        update: {},
      });

      // Replace all items
      await tx.prescriptionItem.deleteMany({
        where: { prescriptionId: prescription.id },
      });

      if (items.length > 0) {
        await tx.prescriptionItem.createMany({
          data: items.map((item) => ({
            prescriptionId: prescription.id,
            medicineId: item.medicineId,
            dosage: item.dosage,
            frequency: item.frequency,
            startDate: new Date(item.startDate),
            endDate: new Date(item.endDate),
            mealRelation: item.mealRelation,
            specificTime: item.specificTime ?? null,
            note: item.note ?? null,
          })),
        });
      }

      return tx.prescription.findUnique({
        where: { id: prescription.id },
        include: prescriptionInclude,
      });
    });
  }

  async delete(id: string) {
    return this.prisma.prescription.delete({ where: { id } });
  }

  async findByIdForPrint(id: string) {
    return this.prisma.prescription.findUnique({
      where: { id },
      include: prescriptionPrintInclude,
    });
  }
}
