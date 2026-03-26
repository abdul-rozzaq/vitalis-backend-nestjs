import { Injectable } from '@nestjs/common';
import { AssignmentsRepository } from './assignments.repository';
import { AppException } from '../../common/exceptions/app.exception';
import { Prisma } from '../../generated/prisma/client';

type CreateAssignmentDto = {
  userId: string;
  departmentId: string;
  roomId?: string | null;
  isActive?: boolean;
  schedules?: { dayOfWeek?: number; startTime: string; endTime: string }[];
};

type UpdateAssignmentDto = {
  roomId?: string | null;
  isActive?: boolean;
  schedules?: { dayOfWeek?: number; startTime: string; endTime: string }[];
};

@Injectable()
export class AssignmentsService {
  constructor(private readonly repo: AssignmentsRepository) {}

  async list(filters?: { departmentId?: string; userId?: string; isActive?: boolean }) {
    return this.repo.list(filters);
  }

  async retrieve(id: string) {
    const assignment = await this.repo.retrieve(id);
    if (!assignment) throw new AppException('Assignment not found', 404);
    return assignment;
  }

  async create({ schedules, userId, departmentId, roomId, ...rest }: CreateAssignmentDto) {
    const data: Prisma.AssignmentCreateInput = {
      ...rest,
      user: { connect: { id: userId } },
      department: { connect: { id: departmentId } },
      ...(roomId && { room: { connect: { id: roomId } } }),
    };
    return this.repo.create(data, schedules);
  }

  async update(id: string, { schedules, roomId, ...rest }: UpdateAssignmentDto) {
    await this.retrieve(id);
    const data: Prisma.AssignmentUpdateInput = {
      ...rest,
      ...(roomId !== undefined && {
        room: roomId ? { connect: { id: roomId } } : { disconnect: true },
      }),
    };
    return this.repo.update(id, data, schedules);
  }

  async delete(id: string) {
    await this.retrieve(id);
    return this.repo.delete(id);
  }
}
