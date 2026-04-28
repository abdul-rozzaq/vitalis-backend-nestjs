import { Body, Controller, Delete, Get, Header, Param, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { UpsertPrescriptionDto } from "./prescriptions.dto";
import { PrescriptionsService } from "./prescriptions.service";

@Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.HAMSHIRA)
@Controller("prescriptions")
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  findByQuery(@Query("appointmentId") appointmentId: string, @Query("caseStepId") caseStepId: string, @CurrentUser() user: JwtPayload) {
    const isDoctor = user.role === RoleName.DOCTOR;
    if (caseStepId) {
      return this.prescriptionsService.getByCaseStep(caseStepId, user.userId, isDoctor);
    }
    return this.prescriptionsService.getByAppointment(appointmentId, user.userId, isDoctor);
  }

  @Roles(RoleName.ADMIN, RoleName.DOCTOR)
  @Post()
  upsert(@Body() dto: UpsertPrescriptionDto) {
    return this.prescriptionsService.upsert(dto);
  }

  @Roles(RoleName.ADMIN, RoleName.DOCTOR)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.prescriptionsService.delete(id);
  }

  @Get(":id/print")
  @Header("Content-Type", "text/html; charset=utf-8")
  print(@Param("id") id: string) {
    return this.prescriptionsService.generatePrintableHtml(id);
  }
}
