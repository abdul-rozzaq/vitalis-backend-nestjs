import { Public } from "@/common/decorators/public.decorator";
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { CheckOutDto, CreateWardDto, UpdateWardDto, WardQueryDto } from "./wards.dto";
import { WardsService } from "./wards.service";

@Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.DOCTOR, RoleName.HAMSHIRA, RoleName.DIREKTOR)
@Controller("/wards")
export class WardsController {
  constructor(private readonly service: WardsService) {}
  @Get("/")
  getAll(@Query() query: WardQueryDto) {
    return this.service.getAll(query);
  }
  @Public()
  @Get("/occupied")
  getOccupied() {
    return this.service.getAllOccupied();
  }
  @Public()
  @Get("/board")
  getBoard() {
    return this.service.getBoard();
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR, RoleName.HISOBCHI)
  @Get("/stats")
  getStats() {
    return this.service.getStats();
  }

  @Get("/doctors")
  getDoctors() {
    return this.service.getDoctors();
  }

  @Get("/room/:roomId")
  getByRoom(@Param("roomId") roomId: string) {
    return this.service.getByRoom(roomId);
  }
  @Get("/room/:roomId/occupancy")
  roomOccupancy(@Param("roomId") roomId: string) {
    return this.service.roomOccupancy(roomId);
  }
  @Get("/:id")
  getOne(@Param("id") id: string) {
    return this.service.getById(id);
  }

  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.HAMSHIRA, RoleName.DOCTOR)
  @Post("/check-in")
  checkIn(@Body() dto: CreateWardDto, @CurrentUser() user: JwtPayload) {
    return this.service.checkIn(dto, user.userId, user.role as RoleName);
  }

  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.HAMSHIRA, RoleName.DOCTOR)
  @Patch("/:id")
  update(@Param("id") id: string, @Body() dto: UpdateWardDto) {
    return this.service.update(id, dto);
  }
  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.HAMSHIRA, RoleName.DOCTOR)
  @Patch("/:id/check-out")
  checkOut(@Param("id") id: string, @Body() dto: CheckOutDto, @CurrentUser() user: JwtPayload) {
    return this.service.checkOut(id, dto, user.userId, user.role as RoleName);
  }
  @Roles(RoleName.ADMIN)
  @Delete("/:id")
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
