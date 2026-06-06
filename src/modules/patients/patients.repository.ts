import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WardStatus } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PatientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getTimeline(id: string, userId: string, isDoctor: boolean) {
    return this.prisma.appointment.findMany({
      where: {
        patientId: id,
        ...(isDoctor ? { assignment: { userId } } : {}),
      },
      include: {
        assignment: {
          include: {
            department: true,
            user: true,
          },
        },
        files: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { dateTime: "desc" },
    });
  }

  async list(userId: string, isDoctor: boolean, search?: string, excludeOccupied?: boolean) {
    console.log(">>> excludeOccupied:", excludeOccupied);
    return this.prisma.patient.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [{ id: { contains: search, mode: "insensitive" } }, { first_name: { contains: search, mode: "insensitive" } }, { last_name: { contains: search, mode: "insensitive" } }],
            }
          : {}),
        ...(isDoctor ? { appointments: { some: { assignment: { userId } } } } : {}),
        ...(excludeOccupied
          ? {
              wards: {
                none: { status: WardStatus.OCCUPIED },
              },
            }
          : {}),
      },
      include: { district: { include: { region: true } } },
    });
  }

  async retrieve(id: string, userId: string, isDoctor: boolean) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        ...(isDoctor ? { appointments: { some: { assignment: { userId } } } } : {}),
        deletedAt: null,
      },
      include: { district: { include: { region: true } } },
    });
    
    if (!patient) throw new NotFoundException("Patient not found");
    return patient;
  }

  async create(data: Prisma.PatientCreateInput) {
    return this.prisma.patient.create({ data });
  }

  async update(id: string, data: Prisma.PatientUpdateInput) {
    return this.prisma.patient.update({ where: { id }, data });
  }

  async delete(id: string) {
    // return this.prisma.patient.delete({ where: { id } });
    return this.prisma.patient.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
