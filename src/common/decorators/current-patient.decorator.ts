import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { PatientJwtPayload } from "../types/patient-jwt-payload.type";

/** Mirrors @CurrentUser(), but for routes behind PatientAuthGuard (request.patient, not request.user). */
export const CurrentPatient = createParamDecorator((data: unknown, ctx: ExecutionContext): PatientJwtPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.patient;
});
