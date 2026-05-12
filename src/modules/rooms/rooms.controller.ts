import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { CreateRoomDto, UpdateRoomDto } from "./rooms.dto";
import { RoomsService } from "./rooms.service";

@Controller("rooms")
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /**
   * GET /api/rooms
   * Barcha xonalar (occupancy bilan) — bir necha rol ko'ra oladi
   */
  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.DOCTOR, RoleName.HAMSHIRA, RoleName.DIREKTOR, RoleName.HISOBCHI)
  @Get()
  findAll() {
    return this.roomsService.list();
  }

  /**
   * GET /api/rooms/wards
   * Faqat WARD tipli palatalar — check-in modal uchun
   */
  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.HAMSHIRA, RoleName.DOCTOR)
  @Get("wards")
  findWards() {
    return this.roomsService.listWards();
  }

  /**
   * GET /api/rooms/:id
   */
  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.DOCTOR, RoleName.HAMSHIRA, RoleName.DIREKTOR)
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.roomsService.retrieve(id);
  }

  /**
   * POST /api/rooms
   */
  @Roles(RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  /**
   * PATCH /api/rooms/:id
   */
  @Roles(RoleName.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }

  /**
   * DELETE /api/rooms/:id
   */
  @Roles(RoleName.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.roomsService.delete(id);
  }
}
