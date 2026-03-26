import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

export interface TimelineEvent {
  id: string;
  type: 'visit' | 'payment';
  date: string;
  title: string;
  description?: string;
  department?: string;
  amount?: number;
  status?: string;
  payment_method?: string;
}

@Injectable()
export class PatientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getTimeline(id: string): Promise<TimelineEvent[]> {
    const [appointments, payments] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { patientId: id },
        include: { assignment: { include: { department: true, user: true } } },
      }),
      this.prisma.payment.findMany({
        where: { patientId: id },
        include: { department: true },
      }),
    ]);

    const visitEvents: TimelineEvent[] = appointments.map((a) => ({
      id: a.id,
      type: 'visit',
      date: a.dateTime.toISOString(),
      title: a.assignment.department.name,
      description: `Dr. ${a.assignment.user.first_name} ${a.assignment.user.last_name} — ${a.status}`,
      department: a.assignment.department.name,
    }));

    const paymentEvents: TimelineEvent[] = payments.map((p) => ({
      id: p.id,
      type: 'payment',
      date: p.createdAt.toISOString(),
      title: 'Payment received',
      amount: Number(p.amount),
      status: p.status === 'PAID' ? 'PAID' : 'PENDING',
      payment_method: p.method ?? undefined,
      department: p.department.name,
    }));

    return [...visitEvents, ...paymentEvents].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async list(search?: string) {
    return this.prisma.patient.findMany({
      where: search
        ? {
            OR: [
              { id: { contains: search, mode: 'insensitive' } },
              { first_name: { contains: search, mode: 'insensitive' } },
              { last_name: { contains: search, mode: 'insensitive' } },
            ],
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
