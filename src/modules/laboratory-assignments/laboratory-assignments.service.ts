import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateLaboratoryAssignmentDto, UpdateLaboratoryAssignmentDto } from "./laboratory-assignments.dto";
import { LaboratoryAssignmentsRepository } from "./laboratory-assignments.repository";

@Injectable()
export class LaboratoryAssignmentsService {
  constructor(
    private readonly repo: LaboratoryAssignmentsRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll(filters: { laboratoryId?: string; userId?: string; isActive?: boolean }) {
    return this.repo.findAll(filters);
  }

  async findById(id: string) {
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundException("Laboratory assignment not found");
    return a;
  }

  async create(dto: CreateLaboratoryAssignmentDto) {
    const existing = await this.prisma.laboratoryAssignment.findUnique({
      where: { userId_laboratoryId: { userId: dto.userId, laboratoryId: dto.laboratoryId } },
    });
    if (existing) throw new ConflictException("Assignment already exists");
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateLaboratoryAssignmentDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
