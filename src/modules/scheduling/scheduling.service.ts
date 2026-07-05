import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkScheduleDto, CreateShiftDto, AssignShiftDto } from './dto/scheduling.dto';

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  async createWorkSchedule(dto: CreateWorkScheduleDto, userId: string) {
    return this.prisma.workSchedule.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdById: userId,
      },
    });
  }

  async getWorkSchedules(departmentId?: string) {
    return this.prisma.workSchedule.findMany({
      where: departmentId ? { departmentId } : undefined,
      include: {
        createdBy: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getScheduleById(id: string) {
    const schedule = await this.prisma.workSchedule.findUnique({
      where: { id },
      include: {
        shifts: {
          include: {
            assignments: {
              include: { user: true, role: true }
            },
            requirements: {
              include: { role: true }
            }
          }
        }
      }
    });

    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  async createShift(dto: CreateShiftDto) {
    return this.prisma.shift.create({
      data: {
        departmentId: dto.departmentId,
        workScheduleId: dto.workScheduleId,
        startAt: new Date(dto.startAt!),
        endAt: new Date(dto.endAt!),
      },
      include: {
        assignments: true,
        requirements: true,
      }
    });
  }

  async updateShift(id: string, dto: Partial<CreateShiftDto>) {
    return this.prisma.shift.update({
      where: { id },
      data: {
        ...(dto.startAt && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt && { endAt: new Date(dto.endAt) }),
      }
    });
  }

  async assignStaff(shiftId: string, dto: AssignShiftDto) {
    // Check if shift exists
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');

    // Check for existing assignment
    const existing = await this.prisma.shiftAssignment.findUnique({
      where: {
        shiftId_userId: { shiftId, userId: dto.userId }
      }
    });

    if (existing) throw new BadRequestException('User is already assigned to this shift');

    return this.prisma.shiftAssignment.create({
      data: {
        shiftId,
        userId: dto.userId,
        roleId: dto.roleId,
      },
      include: {
        user: true,
        role: true,
      }
    });
  }

  async removeAssignment(shiftId: string, userId: string) {
    return this.prisma.shiftAssignment.delete({
      where: {
        shiftId_userId: { shiftId, userId }
      }
    });
  }
}
