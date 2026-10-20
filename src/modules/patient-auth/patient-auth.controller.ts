import { Body, Controller, Post } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { RequestOtpDto, SelectPatientDto, VerifyOtpDto } from "./patient-auth.dto";
import { PatientAuthService } from "./patient-auth.service";

// Public endpoints — isolated from staff auth (separate JWT secret, separate
// guard — see PatientAuthGuard). @Public() skips the global staff JwtAuthGuard/
// RolesGuard, which otherwise run on every route.
@Controller("patient-auth")
export class PatientAuthController {
  constructor(private readonly service: PatientAuthService) {}

  @Public()
  @Post("request-otp")
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.service.requestOtp(dto.phone);
  }

  @Public()
  @Post("verify-otp")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.service.verifyOtp(dto.phone, dto.code);
  }

  @Public()
  @Post("select-patient")
  selectPatient(@Body() dto: SelectPatientDto) {
    return this.service.selectPatient(dto.preAuthToken, dto.patientId);
  }
}
