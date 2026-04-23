import { Injectable, NotFoundException } from "@nestjs/common";
import { CaseStepStatus, CaseStepType } from "../../generated/prisma/client";
import { AppException } from "../../common/exceptions/app.exception";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { RoleName } from "../../common/enums/role-name.enum";
import { PrismaService } from "../../prisma/prisma.service";
import { AddCaseStepDto, CreateCaseDto, UpdateCaseStepDto } from "./cases.dto";
import { CasesRepository } from "./cases.repository";

@Injectable()
export class CasesService {
  constructor(
    private readonly repo: CasesRepository,
    private readonly prisma: PrismaService,
  ) {}

  findByPatientId(patientId: string, user: JwtPayload) {
    return this.repo.findByPatientId(patientId, user.userId, user.roleName === RoleName.DOCTOR);
  }

  async findById(id: string, user: JwtPayload) {
    const c = await this.repo.findById(id, user.userId, user.roleName === RoleName.DOCTOR);
    if (!c) throw new NotFoundException("Case not found");
    return c;
  }

  async create(dto: CreateCaseDto) {
    return this.repo.create(dto.patientId, dto.chiefComplaint);
  }

  async addStep(caseId: string, dto: AddCaseStepDto, user: JwtPayload) {
    const patientCase = await this.repo.findById(caseId, user.userId, user.roleName === RoleName.DOCTOR);
    if (!patientCase) throw new NotFoundException("Case not found");

    if (dto.type === CaseStepType.CONSULTATION) {
      if (!dto.assignmentId) throw new AppException("assignmentId required for CONSULTATION", 400);

      const assignment = await this.prisma.assignment.findUnique({
        where: { id: dto.assignmentId },
        include: { department: true },
      });
      if (!assignment) throw new AppException("Assignment not found", 404);

      // Create appointment + payment (reuse existing transaction logic)
      const appointment = await this.prisma.$transaction(async (tx) => {
        const appt = await tx.appointment.create({
          data: {
            dateTime: dto.dateTime ? new Date(dto.dateTime) : new Date(),
            status: "PENDING",
            patient: { connect: { id: patientCase.patientId } },
            assignment: { connect: { id: dto.assignmentId! } },
          },
        });
        await tx.payment.create({
          data: {
            amount: assignment.department.price ?? 0,
            status: "UNPAID",
            createdAt: appt.dateTime,
            patient: { connect: { id: patientCase.patientId } },
            department: { connect: { id: assignment.departmentId } },
            assignment: { connect: { id: assignment.id } },
            appointment: { connect: { id: appt.id } },
          },
        });
        return appt;
      });

      return this.repo.createStep(caseId, {
        type: CaseStepType.CONSULTATION,
        status: CaseStepStatus.IN_PROGRESS,
        assignmentId: dto.assignmentId,
        appointmentId: appointment.id,
        note: dto.note,
      });
    }

    if (dto.type === CaseStepType.LAB || dto.type === CaseStepType.PROCEDURE) {
      if (dto.assignmentId && dto.departmentId) {
        await this.prisma.payment.create({
          data: {
            amount: dto.amount ?? 0,
            status: "UNPAID",
            patient: { connect: { id: patientCase.patientId } },
            department: { connect: { id: dto.departmentId } },
            assignment: { connect: { id: dto.assignmentId } },
          },
        });
      }
      return this.repo.createStep(caseId, {
        type: dto.type,
        status: CaseStepStatus.PENDING,
        assignmentId: dto.assignmentId,
        note: dto.note,
      });
    }

    if (dto.type === CaseStepType.DISCHARGE) {
      await this.repo.closeCase(caseId, "COMPLETED");
      return this.repo.createStep(caseId, {
        type: CaseStepType.DISCHARGE,
        status: CaseStepStatus.DONE,
        completedAt: new Date(),
        note: dto.note,
      });
    }

    // REFERRAL, CHECKIN, or any other type — create step as-is
    return this.repo.createStep(caseId, {
      type: dto.type,
      assignmentId: dto.assignmentId,
      note: dto.note,
    });
  }

  async updateStep(caseId: string, stepId: string, dto: UpdateCaseStepDto, user: JwtPayload) {
    // Verify case is accessible
    const patientCase = await this.repo.findById(caseId, user.userId, user.roleName === RoleName.DOCTOR);
    if (!patientCase) throw new NotFoundException("Case not found");

    const step = await this.repo.findStep(stepId);
    if (!step || step.caseId !== caseId) throw new NotFoundException("Step not found");

    const completedAt = dto.completedAt ? new Date(dto.completedAt) : (dto.status === CaseStepStatus.DONE ? new Date() : undefined);

    return this.repo.updateStep(stepId, {
      status: dto.status,
      note: dto.note,
      completedAt,
    });
  }

  async closeCase(caseId: string, status: "COMPLETED" | "CANCELLED", user: JwtPayload) {
    const patientCase = await this.repo.findById(caseId, user.userId, user.roleName === RoleName.DOCTOR);
    if (!patientCase) throw new NotFoundException("Case not found");
    return this.repo.closeCase(caseId, status);
  }
}
