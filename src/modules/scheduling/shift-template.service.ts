import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateShiftTemplateDto {
  departmentId?: string;
  name: string;
  startTime: string;
  endTime: string;
  requirements: { roleId: string; requiredCount: number }[];
}

@Injectable()
export class ShiftTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(dto: CreateShiftTemplateDto) {
    const { requirements, ...data } = dto;
    return this.prisma.shiftTemplate.create({
      data: {
        ...data,
        requirements: {
          create: requirements,
        },
      },
      include: {
        requirements: { include: { role: true } },
      },
    });
  }

  async getTemplates(departmentId?: string) {
    return this.prisma.shiftTemplate.findMany({
      where: departmentId ? { departmentId } : undefined,
      include: {
        requirements: { include: { role: true } },
      },
    });
  }

  async deleteTemplate(id: string) {
    return this.prisma.shiftTemplate.delete({ where: { id } });
  }
}
