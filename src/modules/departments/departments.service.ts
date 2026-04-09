import { Injectable } from '@nestjs/common';
import { DepartmentsRepository } from './departments.repository';
import { Prisma } from '../../generated/prisma/client';

interface CreateDepartmentDto {
  name: string;
  description?: string | null;
  parentId?: string | null;
  price?: number | null;
}

interface UpdateDepartmentDto {
  name?: string;
  description?: string | null;
  parentId?: string | null;
  price?: number | null;
}

@Injectable()
export class DepartmentsService {
  constructor(private readonly repository: DepartmentsRepository) {}

  async list(filter?: 'parents' | 'children') {
    return this.repository.list(filter);
  }

  async retrieve(id: string) {
    return this.repository.retrieve(id);
  }

  async create(data: CreateDepartmentDto) {
    const createData: Prisma.DepartmentCreateInput = {
      name: data.name,
      description: data.description,
      price: data.price,
      ...(data.parentId && { parent: { connect: { id: data.parentId } } }),
    };
    return this.repository.create(createData);
  }

  async update(id: string, data: UpdateDepartmentDto) {
    const updateData: Prisma.DepartmentUpdateInput = {
      name: data.name,
      description: data.description,
      price: data.price,
      ...(data.parentId !== undefined && {
        parent: data.parentId ? { connect: { id: data.parentId } } : { disconnect: true },
      }),
    };
    return this.repository.update(id, updateData);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}
