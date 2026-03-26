import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

export type PermissionDetail = Prisma.PermissionGetPayload<Record<string, never>>;

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByRole(roleId: string): Promise<PermissionDetail[]> {
    return this.prisma.permission.findMany({
      where: { roleId },
      orderBy: [{ path: 'asc' }, { method: 'asc' }],
    });
  }

  async check(roleId: string, method: string, path: string): Promise<boolean> {
    const found = await this.prisma.permission.findUnique({
      where: { roleId_method_path: { roleId, method, path } },
    });
    return found !== null;
  }

  async syncForRole(
    roleId: string,
    permissions: { method: string; path: string }[],
  ): Promise<PermissionDetail[]> {
    await this.prisma.permission.deleteMany({ where: { roleId } });

    if (permissions.length === 0) return [];

    await this.prisma.permission.createMany({
      data: permissions.map((p) => ({ roleId, method: p.method.toUpperCase(), path: p.path })),
      skipDuplicates: true,
    });

    return this.listByRole(roleId);
  }

  async grant(roleId: string, method: string, path: string): Promise<PermissionDetail> {
    return this.prisma.permission.upsert({
      where: { roleId_method_path: { roleId, method: method.toUpperCase(), path } },
      create: { roleId, method: method.toUpperCase(), path },
      update: {},
    });
  }

  async revoke(roleId: string, method: string, path: string): Promise<void> {
    await this.prisma.permission.deleteMany({
      where: { roleId, method: method.toUpperCase(), path },
    });
  }
}
