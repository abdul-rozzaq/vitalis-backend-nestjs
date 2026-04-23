import { Injectable } from "@nestjs/common";
import { PatientsRepository } from "./patients.repository";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class PatientsService {
  constructor(private readonly repository: PatientsRepository) {}

  async getTimeline(id: string, userId: string, isDoctor: boolean) {
    return this.repository.getTimeline(id, userId, isDoctor);
  }

  async list(userId: string, isDoctor: boolean, search?: string) {
    return this.repository.list(userId, isDoctor, search);
  }

  async retrieve(id: string, userId: string, isDoctor: boolean) {
    return this.repository.retrieve(id, userId, isDoctor);
  }

  async create(data: Prisma.PatientCreateInput) {
    return this.repository.create(data);
  }

  async update(id: string, data: Prisma.PatientUpdateInput) {
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}
