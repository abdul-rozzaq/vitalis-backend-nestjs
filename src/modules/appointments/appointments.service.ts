import { Injectable } from '@nestjs/common';
import { AppointmentsRepository } from './appointments.repository';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentStatus } from '../../generated/prisma/client';

interface CreateAppointmentDto {
  dateTime: string;
  status?: AppointmentStatus;
  patientId: string;
  assignmentId: string;
}

interface UpdateAppointmentDto {
  dateTime?: string;
  status?: AppointmentStatus;
  patientId?: string;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly repository: AppointmentsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(search?: string) {
    return this.repository.list(search);
  }

  async retrieve(id: string) {
    return this.repository.retrieve(id);
  }

  async create(data: CreateAppointmentDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: data.assignmentId },
      include: { department: true },
    });

    if (!assignment) {
      throw new AppException('Assignment not found', 404);
    }

    const [appointment] = await this.prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          dateTime: new Date(data.dateTime).toISOString(),
          status: (data.status || AppointmentStatus.PENDING) as AppointmentStatus,
          patient: { connect: { id: data.patientId } },
          assignment: { connect: { id: data.assignmentId } },
        },
        include: {
          patient: true,
          assignment: { include: { department: true, user: true } },
        },
      });

      await tx.payment.create({
        data: {
          amount: assignment.department.price ?? 0,
          status: 'UNPAID',
          patient: { connect: { id: data.patientId } },
          department: { connect: { id: assignment.departmentId } },
          assignment: { connect: { id: assignment.id } },
          appointment: { connect: { id: created.id } },
        },
      });

      return [created];
    });

    return appointment;
  }

  async update(id: string, data: UpdateAppointmentDto) {
    const updateData: any = {
      ...(data.dateTime && { dateTime: new Date(data.dateTime) }),
      ...(data.status && { status: data.status }),
      ...(data.patientId && { patient: { connect: { id: data.patientId } } }),
    };
    return this.repository.update(id, updateData);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}
