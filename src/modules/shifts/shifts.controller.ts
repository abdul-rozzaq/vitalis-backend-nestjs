import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { AssignStaffDto, CreateShiftDto, ShiftsQueryDto, UpdateShiftDto } from "./shifts.dto";
import { ShiftsService } from "./shifts.service";

@Controller("/shifts")
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Get("/")
  list(@Query() query: ShiftsQueryDto) {
    return this.service.list(query);
  }

  @Roles(RoleName.DOCTOR, RoleName.HAMSHIRA)
  @Get("/my/active")
  getMyActive(@CurrentUser() user: JwtPayload) {
    return this.service.getMyActive(user.userId);
  }

  @Roles(RoleName.DOCTOR, RoleName.HAMSHIRA)
  @Get("/my")
  getMyUpcoming(@CurrentUser() user: JwtPayload) {
    return this.service.getMyUpcoming(user.userId);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR, RoleName.DOCTOR, RoleName.HAMSHIRA)
  @Get("/:id")
  retrieve(@Param("id") id: string) {
    return this.service.retrieve(id);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR, RoleName.DOCTOR, RoleName.HAMSHIRA)
  @Get("/:id/board")
  getBoard(@Param("id") id: string) {
    return this.service.getBoard(id);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Post("/")
  create(@Body() dto: CreateShiftDto) {
    return this.service.create(dto);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Patch("/:id")
  update(@Param("id") id: string, @Body() dto: UpdateShiftDto) {
    return this.service.update(id, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Delete("/:id")
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Post("/:id/staff")
  assignStaff(@Param("id") id: string, @Body() dto: AssignStaffDto) {
    return this.service.assignStaff(id, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Delete("/:id/staff/:userId")
  unassignStaff(@Param("id") id: string, @Param("userId") userId: string) {
    return this.service.unassignStaff(id, userId);
  }
}
