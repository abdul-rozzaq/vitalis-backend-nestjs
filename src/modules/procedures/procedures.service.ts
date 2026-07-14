import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProcedureDto, UpdateProcedureDto } from './procedures.dto';
import { ProceduresRepository } from './procedures.repository';

@Injectable()
export class ProceduresService {
  constructor(private readonly repo: ProceduresRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  findByDepartmentId(departmentId: string) {
    return this.repo.findByDepartmentId(departmentId);
  }

  async findById(id: string) {
    const procedure = await this.repo.findById(id);
    if (!procedure) throw new NotFoundException('Procedure not found');
    return procedure;
  }

  create(data: CreateProcedureDto) {
    return this.repo.create(data);
  }

  async update(id: string, data: UpdateProcedureDto) {
    await this.findById(id);
    return this.repo.update(id, data);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
