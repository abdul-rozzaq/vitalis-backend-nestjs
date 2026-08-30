import { Body, Controller, Delete, Get, Param, Put } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { UpsertFixedScheduleDto } from "./fixed-schedules.dto";
import { FixedSchedulesService } from "./fixed-schedules.service";

@Roles(RoleName.ADMIN, RoleName.DIREKTOR)
@Controller("/fixed-schedules")
export class FixedSchedulesController {
  constructor(private readonly service: FixedSchedulesService) {}

  @Get("/")
  list() {
    return this.service.list();
  }

  @Get("/:userId")
  retrieve(@Param("userId") userId: string) {
    return this.service.getForUser(userId);
  }

  @Put("/:userId")
  upsert(@Param("userId") userId: string, @Body() dto: UpsertFixedScheduleDto) {
    return this.service.upsert(userId, dto);
  }

  @Delete("/:userId")
  remove(@Param("userId") userId: string) {
    return this.service.remove(userId);
  }
}
