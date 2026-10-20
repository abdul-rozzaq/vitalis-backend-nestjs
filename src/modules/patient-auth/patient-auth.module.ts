import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { PatientAuthController } from "./patient-auth.controller";
import { PatientAuthService } from "./patient-auth.service";
import { SmsService } from "./sms.service";

@Module({
  imports: [PrismaModule],
  controllers: [PatientAuthController],
  providers: [PatientAuthService, SmsService],
})
export class PatientAuthModule {}
