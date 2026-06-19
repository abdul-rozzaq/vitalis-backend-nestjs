import { Controller, Get, Param, Query } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { ShiftEventsQueryDto } from "./shift-events.dto";
import { ShiftEventsService } from "./shift-events.service";

@Controller("/shift-events")
export class ShiftEventsController {
  constructor(private readonly service: ShiftEventsService) {}

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Get("/")
  findAll(@Query() query: ShiftEventsQueryDto) {
    return this.service.findAll(query);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR, RoleName.DOCTOR, RoleName.HAMSHIRA)
  @Get("/assignment/:id")
  findByAssignment(@Param("id") id: string) {
    return this.service.findByAssignment(id);
  }
}
