import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";

const appointmentInclude = {
  patient: true,
  assignment: { include: { department: true, user: true, room: true } },
  payments: { include: { department: true } },
  files: { orderBy: { createdAt: "desc" } },
  prescription: {
    include: {
      items: {
        include: { medicine: true },
        orderBy: { medicine: { name: "asc" } },
      },
    },
  },
} as const;

@Injectable()
export class AppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(search?: string, departmentId?: string, patientId?: string) {
    return this.prisma.appointment.findMany({
      include: appointmentInclude,
      where: {
        ...(patientId && { patientId }),
        ...(departmentId && { assignment: { departmentId } }),
        ...(search && {
          OR: [
            {
              patient: {
                first_name: { contains: search, mode: "insensitive" },
              },
            },
            {
              patient: { last_name: { contains: search, mode: "insensitive" } },
            },
            {
              assignment: {
                user: { first_name: { contains: search, mode: "insensitive" } },
              },
            },
            {
              assignment: {
                user: { last_name: { contains: search, mode: "insensitive" } },
              },
            },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async retrieve(id: string) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
  }

  async create(data: Prisma.AppointmentCreateInput) {
    return this.prisma.appointment.create({
      data,
      include: appointmentInclude,
    });
  }

  async update(id: string, data: Prisma.AppointmentUpdateInput) {
    return this.prisma.appointment.update({
      where: { id },
      data,
      include: appointmentInclude,
    });
  }

  async delete(id: string) {
    return this.prisma.appointment.delete({ where: { id } });
  }

  async addFile(id: string, dto: { name: string; url: string }) {
    return this.prisma.appointmentFile.create({
      data: {
        name: dto.name,
        url: dto.url,
        appointment: { connect: { id } },
      },
    });
  }
}
