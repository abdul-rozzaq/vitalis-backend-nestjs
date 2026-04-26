import { Controller, Get, Post, Delete, Param, Body, Query, Header } from "@nestjs/common";
import { PrescriptionsService } from "./prescriptions.service";
import { UpsertPrescriptionDto } from "./prescriptions.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { RoleName } from "../../common/enums/role-name.enum";

@Controller("prescriptions")
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  findByQuery(
    @Query("appointmentId") appointmentId: string,
    @Query("caseStepId") caseStepId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const isDoctor = user.roleName === RoleName.DOCTOR;
    if (caseStepId) {
      return this.prescriptionsService.getByCaseStep(caseStepId, user.userId, isDoctor);
    }
    return this.prescriptionsService.getByAppointment(appointmentId, user.userId, isDoctor);
  }

  @Post()
  upsert(@Body() dto: UpsertPrescriptionDto) {
    return this.prescriptionsService.upsert(dto);
  }

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
