import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
} from "@nestjs/common";
import { PrescriptionsService } from "./prescriptions.service";
import { UpsertPrescriptionDto } from "./prescriptions.dto";

@Controller("prescriptions")
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  findByAppointment(@Query("appointmentId") appointmentId: string) {
    return this.prescriptionsService.getByAppointment(appointmentId);
  }

  @Post()
  upsert(@Body() dto: UpsertPrescriptionDto) {
    return this.prescriptionsService.upsert(dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.prescriptionsService.delete(id);
  }
}
