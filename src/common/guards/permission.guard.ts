import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtPayload } from "../types/jwt-payload.type";
import { Request } from "express";
import { SKIP_PERMISSION_CHECK_KEY } from "../decorators/skip-permission-check.decorator";

// ─── In-memory Permission Cache ──────────────────────────────────────────────
// Key: "roleId:METHOD:/normalized/path"  Value: { allowed, expiresAt }  TTL: 5 min
const CACHE_TTL_MS = 5 * 60 * 1000;

// ─── Path Normalization ───────────────────────────────────────────────────────
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const OBJECT_ID_REGEX = /\b[0-9a-f]{24}\b/gi;
const NUMERIC_SEGMENT = /\/\d+(?=\/|$)/g;

function normalizePath(rawPath: string): string {
  return rawPath
    .replace(UUID_REGEX, ":id")
    .replace(OBJECT_ID_REGEX, ":id")
    .replace(NUMERIC_SEGMENT, "/:id")
    .replace(/\/:id\/:id/g, "/:id");
}

@Injectable()
export class PermissionGuard implements CanActivate {
  private cache = new Map<string, { allowed: boolean; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  invalidateCache(roleId?: string) {
    if (roleId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${roleId}:`)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip public routes (already handled by JwtAuthGuard but check here too)
    const isPublic = this.reflector.getAllAndOverride<boolean>("isPublic", [context.getHandler(), context.getClass()]);

    if (isPublic) return true;

    const skipPermissionCheck = this.reflector.getAllAndOverride<boolean>(SKIP_PERMISSION_CHECK_KEY, [context.getHandler(), context.getClass()]);

    if (skipPermissionCheck) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as JwtPayload;

    if (!user) return true; // JwtAuthGuard already handles missing users

    const { roleId, roleName, isSuperUser } = user;

    // Superuser and ADMIN bypass all permission checks
    if (isSuperUser || roleName === "ADMIN") return true;

    // Check requireAdmin decorator
    const requireAdmin = this.reflector.getAllAndOverride<boolean>("requireAdmin", [context.getHandler(), context.getClass()]);

    if (requireAdmin) throw new ForbiddenException("Admin privileges required");

    const method = request.method.toUpperCase();
    const rawUrl = request.originalUrl || request.url;
    const normalized = normalizePath(rawUrl.replace(/\?.*$/, ""));

    const cacheKey = `${roleId}:${method}:${normalized}`;

    // Cache check
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      if (cached.allowed) return true;
      throw new ForbiddenException(`Permission denied — required: ${method} ${normalized}`);
    }

    // DB check
    const permission = await this.prisma.permission.findUnique({
      where: { roleId_method_path: { roleId, method, path: normalized } },
    });

    const allowed = permission !== null;

    this.cache.set(cacheKey, { allowed, expiresAt: Date.now() + CACHE_TTL_MS });

    if (allowed) return true;

    throw new ForbiddenException(`Permission denied — required: ${method} ${normalized}`);
  }
}
