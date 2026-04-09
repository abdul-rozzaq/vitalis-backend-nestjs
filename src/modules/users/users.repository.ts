import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

export type UserWithRole = Prisma.UserGetPayload<{
  include: { role: true };
}>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({ where: { id }, include: { role: true } });
  }

  async findByPhone(phone: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({ where: { phone }, include: { role: true } });
  }

  async create(data: Prisma.UserUncheckedCreateInput): Promise<UserWithRole> {
    return this.prisma.user.create({ data, include: { role: true } });
  }

  async update(id: string, data: Prisma.UserUncheckedUpdateInput): Promise<UserWithRole> {
    return this.prisma.user.update({ where: { id }, data, include: { role: true } });
  }

  async delete(id: string): Promise<UserWithRole> {
    return this.prisma.user.delete({ where: { id }, include: { role: true } });
  }

  async findAll(roleId?: string): Promise<UserWithRole[]> {
    return this.prisma.user.findMany({
      where: roleId ? { roleId } : undefined,
      include: { role: true },
    });
  }
}
