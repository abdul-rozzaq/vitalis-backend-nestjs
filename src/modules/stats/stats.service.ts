import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      patientsTotal,
      appointmentsToday,
      employeesTotal,
      paymentsUnpaid,
      recentPatients,
      recentAppointments,
    ] = await Promise.all([
      this.prisma.patient.count(),
      this.prisma.appointment.count({
        where: { dateTime: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.user.count(),
      this.prisma.payment.count({ where: { status: "UNPAID" } }),
      this.prisma.patient.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          createdAt: true,
        },
      }),
      this.prisma.appointment.findMany({
        orderBy: { dateTime: "desc" },
        take: 5,
        select: {
          id: true,
          dateTime: true,
          status: true,
          patient: { select: { id: true, first_name: true, last_name: true } },
          assignment: {
            select: {
              department: { select: { name: true } },
              user: { select: { first_name: true, last_name: true } },
            },
          },
        },
      }),
    ]);

    return {
      patientsTotal,
      appointmentsToday,
      employeesTotal,
      paymentsUnpaid,
      recentPatients,
      recentAppointments,
    };
  }
}
