import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateDiagnosticAssignmentDto,
  UpdateDiagnosticAssignmentDto,
} from "./diagnostic-assignments.dto";
import { DiagnosticAssignmentsRepository } from "./diagnostic-assignments.repository";

@Injectable()
export class DiagnosticAssignmentsService {
  constructor(
    private readonly repo: DiagnosticAssignmentsRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll(filters: { diagnosticsId?: string; userId?: string; isActive?: boolean }) {
    return this.repo.findAll(filters);
  }

  async findById(id: string) {
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundException("Diagnostic assignment not found");
    return a;
  }

  async create(dto: CreateDiagnosticAssignmentDto) {
    const existing = await this.prisma.diagnosticAssignment.findUnique({
      where: {
        userId_diagnosticsId: {
          userId: dto.userId,
          diagnosticsId: dto.diagnosticsId,
        },
      },
    });
    if (existing) throw new ConflictException("Assignment already exists");
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateDiagnosticAssignmentDto) {
    const current = await this.findById(id);

    const nextUserId = dto.userId ?? current.userId;
    const nextDiagnosticsId = dto.diagnosticsId ?? current.diagnosticsId;

    // Agar userId yoki diagnosticsId o'zgartirilayotgan bo'lsa, boshqa yozuv bilan
    // to'qnashmasligini tekshiramiz (unique constraint: userId + diagnosticsId)
    const isChangingPair =
      nextUserId !== current.userId || nextDiagnosticsId !== current.diagnosticsId;

    if (isChangingPair) {
      const existing = await this.prisma.diagnosticAssignment.findUnique({
        where: {
          userId_diagnosticsId: {
            userId: nextUserId,
            diagnosticsId: nextDiagnosticsId,
          },
        },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException("Assignment already exists");
      }
    }

    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}