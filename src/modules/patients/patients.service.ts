import { Injectable } from '@nestjs/common';
import { PatientsRepository } from './patients.repository';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class PatientsService {
  constructor(private readonly repository: PatientsRepository) {}

  async getTimeline(id: string) {
    return this.repository.getTimeline(id);
  }

  async list(search?: string) {
    return this.repository.list(search);
  }

  async retrieve(id: string) {
    return this.repository.retrieve(id);
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
