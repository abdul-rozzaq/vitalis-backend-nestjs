import { Controller, Get, Query } from "@nestjs/common";
import { PermissionsService } from "./permissions.service";
import { ROUTES_REGISTRY } from "../../routes-registry";

@Controller("/permissions")
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * GET /api/permissions/available-routes
   * Optional: ?roleId=xxx to show which are granted for that role
   */
  @Get("/available-routes")
  async availableRoutes(@Query("roleId") roleId?: string) {
    if (roleId) {
      const granted = await this.permissionsService.list(roleId);
      const grantedSet = new Set(granted.map((p) => `${p.method}:${p.path}`));

      return ROUTES_REGISTRY.map((route) => ({
        ...route,
        allowed: grantedSet.has(`${route.method}:${route.path}`),
      }));
    }

    return ROUTES_REGISTRY;
  }
}
