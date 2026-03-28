import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

const assignmentInclude = {
  user: { select: { id: true, first_name: true, last_name: true, role: true } },
  department: true,
  room: true,
  schedules: true,
} satisfies Prisma.AssignmentInclude;

export type AssignmentDetail = Prisma.AssignmentGetPayload<{ include: typeof assignmentInclude }>;

@Injectable()
export class AssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters?: { departmentId?: string; userId?: string; isActive?: boolean }): Promise<AssignmentDetail[]> {
    return this.prisma.assignment.findMany({
      where: {
        departmentId: filters?.departmentId,
        userId: filters?.userId,
        isActive: filters?.isActive,
      },
      include: assignmentInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async retrieve(id: string): Promise<AssignmentDetail | null> {
    return this.prisma.assignment.findUnique({ where: { id }, include: assignmentInclude });
  }

  async create(
    data: Omit<Prisma.AssignmentCreateInput, 'schedules'>,
    schedules?: { dayOfWeek?: number; startTime: string; endTime: string }[],
  ): Promise<AssignmentDetail> {
    const normalizedSchedules = schedules?.map((s) => ({ ...s, dayOfWeek: s.dayOfWeek ?? 0 }));
    return this.prisma.assignment.create({
      data: {
        ...data,
        ...(normalizedSchedules && normalizedSchedules.length > 0 && { schedules: { create: normalizedSchedules } }),
      },
      include: assignmentInclude,
    });
  }

  async update(
    id: string,
    data: Prisma.AssignmentUpdateInput,
    schedules?: { dayOfWeek?: number; startTime: string; endTime: string }[],
  ): Promise<AssignmentDetail> {
    const normalizedSchedules = schedules?.map((s) => ({ ...s, dayOfWeek: s.dayOfWeek ?? 0 }));
    return this.prisma.assignment.update({
      where: { id },
      data: {
        ...data,
        ...(normalizedSchedules && {
          schedules: {
            deleteMany: {},
            create: normalizedSchedules,
          },
        }),
      },
      include: assignmentInclude,
    });
  }

  async delete(id: string): Promise<AssignmentDetail> {
    return this.prisma.assignment.delete({ where: { id }, include: assignmentInclude });
  }
}
