import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { PatientJwtPayload } from "../types/patient-jwt-payload.type";

/**
 * Fully separate from JwtAuthGuard/RolesGuard: patient tokens are signed with
 * PATIENT_JWT_SECRET, not JWT_SECRET, so a staff or patient token can never be
 * mistaken for the other. Routes behind this guard must also carry @Public()
 * so the global staff guards don't run their own (irrelevant) checks on them.
 */
@Injectable()
export class PatientAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      throw new UnauthorizedException("Access token is missing");
    }

    try {
      const payload = this.jwtService.verify<PatientJwtPayload>(token, {
        secret: process.env.PATIENT_JWT_SECRET,
      });

      if (payload.type !== "patient") {
        throw new UnauthorizedException("Invalid token");
      }

      (request as any).patient = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
