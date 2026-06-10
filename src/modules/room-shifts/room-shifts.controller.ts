import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { CreateRoomShiftDto, RoomShiftAddRoomDto, UpdateRoomShiftDto } from "./room-shifts.dto";
import { RoomShiftsService } from "./room-shifts.service";

@Roles(RoleName.ADMIN, RoleName.DIREKTOR)
@Controller("/room-shifts")
export class RoomShiftsController {
  constructor(private readonly service: RoomShiftsService) {}

  @Post("/")
  create(@Body() dto: CreateRoomShiftDto) {
    return this.service.create(dto);
  }

  @Get("/")
  findAll(@Query("roomId") roomId?: string) {
    return this.service.findAll(roomId);
  }

  @Patch("/:id")
  update(@Param("id") id: string, @Body() dto: UpdateRoomShiftDto) {
    return this.service.update(id, dto);
  }

  @Post("/:id/rooms")
  addRoom(@Param("id") id: string, @Body() dto: RoomShiftAddRoomDto) {
    return this.service.addRoom(id, dto.roomId);
  }

  @Delete("/:id/rooms/:roomId")
  removeRoom(@Param("id") id: string, @Param("roomId") roomId: string) {
    return this.service.removeRoom(id, roomId);
  }

  @Delete("/:id")
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
