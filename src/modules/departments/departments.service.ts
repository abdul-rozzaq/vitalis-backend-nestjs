import { Injectable } from "@nestjs/common";
import { DepartmentsRepository } from "./departments.repository";
import { Prisma } from "../../generated/prisma/client";

interface CreateDepartmentDto {
  name: string;
  description?: string | null;
  parentId?: string | null;
  price?: number | null;
  patientDailyPrice?: number | null;
  companionDailyPrice?: number | null;
}

interface UpdateDepartmentDto {
  name?: string;
  description?: string | null;
  parentId?: string | null;
  price?: number | null;
  patientDailyPrice?: number | null;
  companionDailyPrice?: number | null;
}

@Injectable()
export class DepartmentsService {
  constructor(private readonly repository: DepartmentsRepository) {}

  async list(filter?: "parents" | "children") {
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
      ...(data.patientDailyPrice != null && {
        patientDailyPrice: new Prisma.Decimal(data.patientDailyPrice),
      }),
      ...(data.companionDailyPrice != null && {
        companionDailyPrice: new Prisma.Decimal(data.companionDailyPrice),
      }),
      ...(data.parentId && { parent: { connect: { id: data.parentId } } }),
    };
    return this.repository.create(createData);
  }

  async update(id: string, data: UpdateDepartmentDto) {
    const updateData: Prisma.DepartmentUpdateInput = {
      name: data.name,
      description: data.description,
      price: data.price,
      ...(data.patientDailyPrice !== undefined && {
        patientDailyPrice:
          data.patientDailyPrice != null
            ? new Prisma.Decimal(data.patientDailyPrice)
            : null,
      }),
      ...(data.companionDailyPrice !== undefined && {
        companionDailyPrice:
          data.companionDailyPrice != null
            ? new Prisma.Decimal(data.companionDailyPrice)
            : null,
      }),
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
