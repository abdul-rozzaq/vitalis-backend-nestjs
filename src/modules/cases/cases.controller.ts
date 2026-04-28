import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { AddCaseStepDto, CreateCaseDto, UpdateCaseStepDto } from "./cases.dto";
import { CasesService } from "./cases.service";

@Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.HAMSHIRA, RoleName.KASSIR)
@Controller("cases")
export class CasesController {
  constructor(private readonly service: CasesService) {}

  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.DOCTOR)
  @Post()
  create(@Body() dto: CreateCaseDto, @CurrentUser() _user: JwtPayload) {
    return this.service.create(dto);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findById(id, user);
  }

  @Roles(RoleName.ADMIN, RoleName.DOCTOR)
  @Post(":id/steps")
  addStep(@Param("id") id: string, @Body() dto: AddCaseStepDto, @CurrentUser() user: JwtPayload) {
    return this.service.addStep(id, dto, user);
  }

  @Patch(":id/steps/:stepId")
  updateStep(@Param("id") id: string, @Param("stepId") stepId: string, @Body() dto: UpdateCaseStepDto, @CurrentUser() user: JwtPayload) {
    return this.service.updateStep(id, stepId, dto, user);
  }

  @Roles(RoleName.ADMIN, RoleName.DOCTOR)
  @Patch(":id/close")
  closeCase(@Param("id") id: string, @Body("status") status: "COMPLETED" | "CANCELLED", @CurrentUser() user: JwtPayload) {
    return this.service.closeCase(id, status ?? "COMPLETED", user);
  }
}

@Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.HAMSHIRA, RoleName.KASSIR)
@Controller("patients/:patientId/cases")
export class PatientCasesController {
  constructor(private readonly service: CasesService) {}

  @Get()
  findByPatient(@Param("patientId") patientId: string, @CurrentUser() user: JwtPayload) {
    return this.service.findByPatientId(patientId, user);
  }
}
