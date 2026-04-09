import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";

const departmentInclude = {
  parent: true,
};

const departmentDetailInclude = {
  parent: true,
  children: true,
};

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter?: "parents" | "children") {
    const where =
      filter === "parents"
        ? { parentId: null }
        : filter === "children"
          ? { NOT: { parentId: null } }
          : undefined;

    return this.prisma.department.findMany({
      where,
      include: departmentInclude,
    });
  }

  async retrieve(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      include: departmentDetailInclude,
    });
  }

  async create(data: Prisma.DepartmentCreateInput) {
    return this.prisma.department.create({ data });
  }

  async update(id: string, data: Prisma.DepartmentUpdateInput) {
    return this.prisma.department.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.department.delete({ where: { id } });
  }
}
