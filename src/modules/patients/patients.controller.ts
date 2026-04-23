import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from "@nestjs/common";
import { PatientsService } from "./patients.service";
import { CreatePatientDto, UpdatePatientDto } from "./patients.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { RoleName } from "../../common/enums/role-name.enum";

@Controller("patients")
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  findAll(@Query("search") search: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.list(user.userId, user.roleName === RoleName.DOCTOR, search);
  }

  @Get(":id/timeline")
  getTimeline(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.getTimeline(id, user.userId, user.roleName === RoleName.DOCTOR);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.retrieve(id, user.userId, user.roleName === RoleName.DOCTOR);
  }

  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto as any);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto as any);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.patientsService.delete(id);
  }
}
