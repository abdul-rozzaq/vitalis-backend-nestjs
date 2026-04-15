import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { PermissionsService } from "./permissions.service";
import { RequireAdmin } from "../../common/decorators/require-admin.decorator";
import { SkipPermissionCheck } from "../../common/decorators/skip-permission-check.decorator";

@Controller("roles/:roleId/permissions")
export class RolesPermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /** GET /api/roles/:roleId/permissions */
  @Get()
  @SkipPermissionCheck()
  list(@Param("roleId") roleId: string) {
    return this.permissionsService.list(roleId);
  }

  /** PUT /api/roles/:roleId/permissions — full sync */
  @Put()
  @RequireAdmin()
  sync(@Param("roleId") roleId: string, @Body() permissions: { method: string; path: string }[]) {
    if (!Array.isArray(permissions)) {
      throw new Error("Body must be an array of { method, path }");
    }
    return this.permissionsService.sync(roleId, permissions);
  }

  /** POST /api/roles/:roleId/permissions — grant single permission */
  @Post()
  @RequireAdmin()
  @HttpCode(HttpStatus.CREATED)
  grant(@Param("roleId") roleId: string, @Body() body: { method: string; path: string }) {
    return this.permissionsService.grant(roleId, body.method, body.path);
  }

  /** DELETE /api/roles/:roleId/permissions — revoke single permission */
  @Delete()
  @RequireAdmin()
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param("roleId") roleId: string, @Body() body: { method: string; path: string }) {
    await this.permissionsService.revoke(roleId, body.method, body.path);
  }
}
