import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { CreateAppointmentDto, CreateAppointmentFileDto, UpdateAppointmentDto } from "./appointments.dto";
import { AppointmentsService } from "./appointments.service";

@Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.DOCTOR, RoleName.HAMSHIRA, RoleName.DIREKTOR)
@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  findAll(@Query("search") search: string, @Query("departmentId") departmentId: string, @Query("patientId") patientId: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.list(user.userId, user.role === RoleName.DOCTOR, search, departmentId, patientId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.retrieve(id, user.userId, user.role === RoleName.DOCTOR);
  }

  @Roles(RoleName.ADMIN, RoleName.KASSIR)
  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto as any);
  }

  @Post(":id/files")
  addFile(@Param("id") id: string, @Body() dto: CreateAppointmentFileDto, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.addFile(id, dto, user.userId, user.role === RoleName.DOCTOR);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, dto as any);
  }

  @Roles(RoleName.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.appointmentsService.delete(id);
  }
}
