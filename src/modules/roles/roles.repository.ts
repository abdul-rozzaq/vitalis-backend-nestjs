import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

export type RoleDetail = Prisma.RoleGetPayload<Record<string, never>>;

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<RoleDetail[]> {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async retrieve(id: string): Promise<RoleDetail | null> {
    return this.prisma.role.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<RoleDetail | null> {
    return this.prisma.role.findUnique({ where: { name } });
  }

  async create(data: Prisma.RoleCreateInput): Promise<RoleDetail> {
    return this.prisma.role.create({ data });
  }

  async update(id: string, data: Prisma.RoleUpdateInput): Promise<RoleDetail> {
    return this.prisma.role.update({ where: { id }, data });
  }

  async delete(id: string): Promise<RoleDetail> {
    return this.prisma.role.delete({ where: { id } });
  }
}
