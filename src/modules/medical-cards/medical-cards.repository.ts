import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";

const PATIENT_INCLUDE = {
  patient: {
    include: {
      district: { include: { region: true } },
    },
  },
} satisfies Prisma.MedicalCard003Include;

@Injectable()
export class MedicalCardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.MedicalCard003CreateInput) {
    return this.prisma.medicalCard003.create({ data, include: PATIENT_INCLUDE });
  }

  async findById(id: string, userId: string, isDoctor: boolean) {
    if (isDoctor) {
      return this.prisma.medicalCard003.findFirst({
        where: { id, patient: { appointments: { some: { assignment: { userId } } } } },
        include: PATIENT_INCLUDE,
      });
    }
    return this.prisma.medicalCard003.findUnique({ where: { id }, include: PATIENT_INCLUDE });
  }

  async findByPatientId(patientId: string, userId: string, isDoctor: boolean) {
    if (isDoctor) {
      const hasAccess = await this.prisma.appointment.findFirst({
        where: { patientId, assignment: { userId } },
        select: { id: true },
      });
      if (!hasAccess) return [];
    }
    return this.prisma.medicalCard003.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: PATIENT_INCLUDE,
    });
  }

  update(id: string, data: Prisma.MedicalCard003UpdateInput) {
    return this.prisma.medicalCard003.update({ where: { id }, data, include: PATIENT_INCLUDE });
  }
}
