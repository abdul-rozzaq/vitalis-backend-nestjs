import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { CreatePatientDto, UpdatePatientDto } from "./patients.dto";
import { PatientsService } from "./patients.service";

@Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.DOCTOR, RoleName.HAMSHIRA, RoleName.LABARANT, RoleName.DIREKTOR)
@Controller("patients")
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  findAll(@Query("search") search: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.list(user.userId, user.role === RoleName.DOCTOR, search);
  }

  @Get(":id/timeline")
  getTimeline(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.getTimeline(id, user.userId, user.role === RoleName.DOCTOR);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.retrieve(id, user.userId, user.role === RoleName.DOCTOR);
  }

  @Roles(RoleName.ADMIN, RoleName.KASSIR)
  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto as any);
  }

  @Roles(RoleName.ADMIN, RoleName.KASSIR)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto as any);
  }

  @Roles(RoleName.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.patientsService.delete(id);
  }
}
