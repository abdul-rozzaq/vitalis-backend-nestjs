import { Injectable } from "@nestjs/common";
import { CaseStatus, CaseStepStatus, CaseStepType, Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export const STEP_INCLUDE = {
  assignment: { include: { department: true, user: true, room: true } },
  appointment: {
    include: {
      files: { orderBy: { createdAt: "desc" } },
      prescription: {
        include: {
          items: { include: { medicine: true }, orderBy: { medicine: { name: "asc" } } },
        },
      },
    },
  },
  prescription: {
    include: {
      items: { include: { medicine: true }, orderBy: { medicine: { name: "asc" } } },
    },
  },
  labOrders: {
    include: {
      laboratory: true,
      items: {
        include: {
          service: { select: { id: true, name: true, price: true } },
          files: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "asc" as const },
      },
    },
  },
  diagnosticOrder: {
    include: {
      diagnostics: true,
      items: {
        include: {
          service: { select: { id: true, name: true, price: true } },
          files: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "asc" as const },
      },
    },
  },
  procedureOrder: {
    include: {
      procedure: true,
      doctor: true,
    },
  },
} as const;

const CASE_INCLUDE = {
  steps: {
    include: STEP_INCLUDE,
    orderBy: { createdAt: "asc" },
  },
} as const;

function doctorWhere(userId: string): Prisma.PatientCaseWhereInput {
  return {
    steps: {
      some: {
        OR: [
          { assignment: { userId } },
          { appointment: { assignmentId: { not: undefined }, assignment: { userId } } },
        ],
      },
    },
  };
}

@Injectable()
export class CasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPatientId(patientId: string, userId: string, isDoctor: boolean) {
    return this.prisma.patientCase.findMany({
      where: {
        patientId,
        // ...(isDoctor ? doctorWhere(userId) : {}),
      },
      include: CASE_INCLUDE,
      orderBy: { openedAt: "desc" },
    });
  }

  async findById(id: string, userId: string, isDoctor: boolean) {
    return this.prisma.patientCase.findFirst({
      where: {
        id,
        // ...(isDoctor ? doctorWhere(userId) : {}),
      },
      include: CASE_INCLUDE,
    });
  }

  async create(patientId: string, chiefComplaint?: string) {
    return this.prisma.$transaction(async (tx) => {
      const patientCase = await tx.patientCase.create({
        data: { patientId, chiefComplaint, status: "ACTIVE" },
        include: CASE_INCLUDE,
      });

      await tx.caseStep.create({
        data: {
          caseId: patientCase.id,
          type: CaseStepType.CHECKIN,
          status: CaseStepStatus.DONE,
          completedAt: new Date(),
        },
      });

      return tx.patientCase.findUnique({
        where: { id: patientCase.id },
        include: CASE_INCLUDE,
      });
    });
  }

  async createStep(caseId: string, data: {
    type: CaseStepType;
    status?: CaseStepStatus;
    assignmentId?: string;
    appointmentId?: string;
    note?: string;
    completedAt?: Date;
  }) {
    return this.prisma.caseStep.create({
      data: {
        caseId,
        type: data.type,
        status: data.status ?? CaseStepStatus.PENDING,
        ...(data.assignmentId && { assignmentId: data.assignmentId }),
        ...(data.appointmentId && { appointmentId: data.appointmentId }),
        ...(data.note && { note: data.note }),
        ...(data.completedAt && { completedAt: data.completedAt }),
      },
      include: STEP_INCLUDE,
    });
  }

  async updateStep(stepId: string, data: { status?: CaseStepStatus; note?: string; completedAt?: Date }) {
    return this.prisma.$transaction(async (tx) => {
      if (data.status) {
        const step = await tx.caseStep.findUnique({
          where: { id: stepId },
          include: { procedureOrder: true },
        });
        if (step?.procedureOrder) {
          let procedureStatus: any = data.status;
          if (data.status === CaseStepStatus.DONE) procedureStatus = "COMPLETED";

          await tx.procedureOrder.update({
            where: { id: step.procedureOrder.id },
            data: { status: procedureStatus },
          });
        }
      }

      return tx.caseStep.update({
        where: { id: stepId },
        data: {
          ...(data.status && { status: data.status }),
          ...(data.note !== undefined && { note: data.note }),
          ...(data.completedAt && { completedAt: data.completedAt }),
        },
        include: STEP_INCLUDE,
      });
    });
  }

  async closeCase(caseId: string, status: CaseStatus) {
    return this.prisma.patientCase.update({
      where: { id: caseId },
      data: { status, closedAt: new Date() },
    });
  }

  async findStep(stepId: string) {
    return this.prisma.caseStep.findUnique({
      where: { id: stepId },
      include: STEP_INCLUDE,
    });
  }


  async deleteStep(stepId: string) {
    return this.prisma.$transaction(async (tx) => {
      const step = await tx.caseStep.findUnique({
        where: { id: stepId },
        include: {
          appointment: { select: { id: true } },
          labOrders: { select: { id: true } },
          diagnosticOrder: { select: { id: true } },
          prescription: { select: { id: true } },
        },
      });
      if (!step) return null;
      if (step.labOrders && step.labOrders.length) {
        for (const lo of step.labOrders) {
          await tx.labOrder.delete({ where: { id: lo.id } });
        }
      }
      if (step.diagnosticOrder) {
        await tx.diagnosticOrder.delete({ where: { id: step.diagnosticOrder.id } });
      }
      if (step.appointment) {
        await tx.appointment.delete({ where: { id: step.appointment.id } });
      }
      if (step.prescription) {
        await tx.prescription.delete({ where: { id: step.prescription.id } });
      }
      return tx.caseStep.delete({ where: { id: stepId } });
    });
  }

  async deleteCase(caseId: string) {
    return this.prisma.$transaction(async (tx) => {
      const steps = await tx.caseStep.findMany({
        where: { caseId },
        include: {
          appointment: { select: { id: true } },
          labOrders: { select: { id: true } },
          diagnosticOrder: { select: { id: true } },
          prescription: { select: { id: true } },
        },
      });
      for (const step of steps) {
        if (step.labOrders && step.labOrders.length) {
          for (const lo of step.labOrders) {
            await tx.labOrder.delete({ where: { id: lo.id } });
          }
        }
        if (step.diagnosticOrder) {
          await tx.diagnosticOrder.delete({ where: { id: step.diagnosticOrder.id } });
        }
        if (step.appointment) {
          await tx.appointment.delete({ where: { id: step.appointment.id } });
        }
        if (step.prescription) {
          await tx.prescription.delete({ where: { id: step.prescription.id } });
        }
      }
      await tx.caseStep.deleteMany({ where: { caseId } });
      return tx.patientCase.delete({ where: { id: caseId } });
    });
  }
}
