import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcedureDto, UpdateProcedureDto } from './procedures.dto';

@Injectable()
export class ProceduresRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.procedure.findMany({
      include: { department: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByDepartmentId(departmentId: string) {
    return this.prisma.procedure.findMany({
      where: { departmentId },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.procedure.findUnique({
      where: { id },
      include: { department: true },
    });
  }

  create(data: CreateProcedureDto) {
    return this.prisma.procedure.create({
      data,
    });
  }

  update(id: string, data: UpdateProcedureDto) {
    return this.prisma.procedure.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.procedure.delete({
      where: { id },
    });
  }
}
