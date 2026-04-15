import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class PatientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getTimeline(id: string) {
    return this.prisma.appointment.findMany({
      where: { patientId: id },
      include: {
        assignment: {
          include: {
            department: true,
            user: true,
          },
        },
        payments: { include: { department: true } },
        files: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { dateTime: "desc" },
    });
  }

  async list(search?: string) {
    return this.prisma.patient.findMany({
      where: search
        ? {
            OR: [{ id: { contains: search, mode: "insensitive" } }, { first_name: { contains: search, mode: "insensitive" } }, { last_name: { contains: search, mode: "insensitive" } }],
          }
        : undefined,
      include: { district: { include: { region: true } } },
    });
  }

  async retrieve(id: string) {
    return this.prisma.patient.findUnique({
      where: { id },
      include: { district: { include: { region: true } } },
    });
  }

  async create(data: Prisma.PatientCreateInput) {
    return this.prisma.patient.create({ data });
  }

  async update(id: string, data: Prisma.PatientUpdateInput) {
    return this.prisma.patient.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.patient.delete({ where: { id } });
  }
}
