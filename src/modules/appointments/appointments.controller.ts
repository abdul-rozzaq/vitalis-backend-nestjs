import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";
import {
  CreateAppointmentDto,
  CreateAppointmentFileDto,
  UpdateAppointmentDto,
} from "./appointments.dto";

@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  findAll(
    @Query("search") search?: string,
    @Query("departmentId") departmentId?: string,
    @Query("patientId") patientId?: string,
  ) {
    return this.appointmentsService.list(search, departmentId, patientId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.appointmentsService.retrieve(id);
  }

  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto as any);
  }

  @Post(":id/files")
  addFile(@Param("id") id: string, @Body() dto: CreateAppointmentFileDto) {
    return this.appointmentsService.addFile(id, dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, dto as any);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.appointmentsService.delete(id);
  }
}
