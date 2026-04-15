import { Injectable } from "@nestjs/common";
import { PermissionsRepository } from "./permissions.repository";
import { RolesRepository } from "../roles/roles.repository";
import { AppException } from "../../common/exceptions/app.exception";
import { PermissionGuard } from "../../common/guards/permission.guard";

const VALID_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;

@Injectable()
export class PermissionsService {
  constructor(
    private readonly repo: PermissionsRepository,
    private readonly rolesRepo: RolesRepository,
    private readonly permissionGuard: PermissionGuard,
  ) {}

  private async assertRoleExists(roleId: string) {
    const role = await this.rolesRepo.retrieve(roleId);
    if (!role) throw new AppException("Role not found", 404);
    return role;
  }

  async list(roleId: string) {
    await this.assertRoleExists(roleId);
    return this.repo.listByRole(roleId);
  }

  async sync(roleId: string, permissions: { method: string; path: string }[]) {
    await this.assertRoleExists(roleId);

    for (const p of permissions) {
      if (!VALID_METHODS.includes(p.method.toUpperCase() as any)) {
        throw new AppException(`Invalid method: ${p.method}. Allowed: ${VALID_METHODS.join(", ")}`, 400);
      }
      if (!p.path.startsWith("/")) {
        throw new AppException(`Path must start with "/": ${p.path}`, 400);
      }
    }

    const result = await this.repo.syncForRole(roleId, permissions);
    this.permissionGuard.invalidateCache(roleId);
    return result;
  }

  async grant(roleId: string, method: string, path: string) {
    await this.assertRoleExists(roleId);
    const result = await this.repo.grant(roleId, method, path);
    this.permissionGuard.invalidateCache(roleId);
    return result;
  }

  async revoke(roleId: string, method: string, path: string) {
    await this.assertRoleExists(roleId);
    await this.repo.revoke(roleId, method, path);
    this.permissionGuard.invalidateCache(roleId);
  }
}
