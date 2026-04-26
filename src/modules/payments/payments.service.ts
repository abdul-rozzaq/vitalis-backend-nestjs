import { Injectable } from "@nestjs/common";
import { PaymentsRepository } from "./payments.repository";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class PaymentsService {
  constructor(private readonly repository: PaymentsRepository) {}

  async list(userId: string, isDoctor: boolean) {
    return this.repository.list(userId, isDoctor);
  }

  async retrieve(id: string, userId: string, isDoctor: boolean) {
    return this.repository.retrieve(id, userId, isDoctor);
  }

  async create(data: { amount: number; method?: string; status?: string; patientId: string; departmentId?: string; assignmentId?: string; appointmentId?: string }) {
    const createData: Prisma.PaymentCreateInput = {
      amount: data.amount,
      ...(data.method && { method: data.method as any }),
      ...(data.status && { status: data.status as any }),
      patient: { connect: { id: data.patientId } },
      ...(data.departmentId && { department: { connect: { id: data.departmentId } } }),
      ...(data.assignmentId && { assignment: { connect: { id: data.assignmentId } } }),
      ...(data.appointmentId && { appointment: { connect: { id: data.appointmentId } } }),
    };
    return this.repository.create(createData);
  }

  async update(id: string, data: Prisma.PaymentUpdateInput) {
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}
