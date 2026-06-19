import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import {
  CreateShiftOverrideDto,
  CreateSwapDto,
  MaterializeShiftDto,
  OvertimeDto,
  PartialTransferDto,
  ShiftAssignmentsQueryDto,
} from "./shift-assignments.dto";
import { ShiftAssignmentsService } from "./shift-assignments.service";

@Controller("/shift-assignments")
export class ShiftAssignmentsController {
  constructor(private readonly service: ShiftAssignmentsService) {}

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Post("/override")
  createOverride(@Body() dto: CreateShiftOverrideDto) {
    return this.service.createOverride(dto);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Delete("/override/:id")
  deleteOverride(@Param("id") id: string) {
    return this.service.deleteOverride(id);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR, RoleName.DOCTOR, RoleName.HAMSHIRA)
  @Get("/active")
  getActive(@Query("roomId") roomId: string) {
    return this.service.resolveActiveForRoom(roomId);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR, RoleName.DOCTOR, RoleName.HAMSHIRA)
  @Post("/materialize")
  materialize(@Body() dto: MaterializeShiftDto, @CurrentUser() user: JwtPayload) {
    return this.service.getOrCreateAssignmentForShift(dto.roomShiftId, dto.roomId, user.userId);
  }

  @Roles(RoleName.DOCTOR, RoleName.HAMSHIRA)
  @Get("/my")
  getMyShifts(@CurrentUser() user: JwtPayload) {
    return this.service.getMyShifts(user.userId);
  }

  @Roles(RoleName.DOCTOR, RoleName.HAMSHIRA)
  @Get("/my/active")
  getMyActiveShifts(@CurrentUser() user: JwtPayload) {
    return this.service.getActiveForUser(user.userId);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Get("/")
  getResolved(@Query() query: ShiftAssignmentsQueryDto) {
    return this.service.getResolvedForRange(query);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Post("/swap")
  createSwap(@Body() dto: CreateSwapDto, @CurrentUser() user: JwtPayload) {
    return this.service.createSwap(dto, user.userId);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Post("/partial-transfer")
  createPartialTransfer(@Body() dto: PartialTransferDto, @CurrentUser() user: JwtPayload) {
    return this.service.createPartialTransfer(dto, user.userId);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR, RoleName.DOCTOR)
  @Post("/overtime")
  createOvertime(@Body() dto: OvertimeDto, @CurrentUser() user: JwtPayload) {
    return this.service.createOvertime(dto, user.userId);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR, RoleName.DOCTOR, RoleName.HAMSHIRA)
  @Get("/:id/history")
  getHistory(@Param("id") id: string) {
    return this.service.getAssignmentHistory(id);
  }
}
