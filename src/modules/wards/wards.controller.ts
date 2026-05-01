import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { CheckOutDto, CreateWardDto, UpdateWardDto, WardQueryDto } from "./wards.dto";
import { WardsService } from "./wards.service";

@Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.DOCTOR, RoleName.HAMSHIRA, RoleName.DIREKTOR)
@Controller("wards")
export class WardsController {
  constructor(private readonly service: WardsService) {}

  /**
   * GET /api/wards
   * Filter: patientId, roomId, status, dateFrom, dateTo, page, limit
   */
  @Get()
  getAll(@Query() query: WardQueryDto) {
    return this.service.getAll(query);
  }

  /**
   * GET /api/wards/occupied
   * Hozir yotayotgan barcha bemorlar
   */
  @Get("occupied")
  getOccupied() {
    return this.service.getAllOccupied();
  }

  /**
   * GET /api/wards/stats
   * Umumiy statistika: band/bo'sh, o'rtacha kunlar
   */
  @Roles(RoleName.ADMIN, RoleName.DIREKTOR, RoleName.HISOBCHI)
  @Get("stats")
  getStats() {
    return this.service.getStats();
  }

  /**
   * GET /api/wards/room/:roomId
   * Xonadagi hozirgi bemorlar
   */
  @Get("room/:roomId")
  getByRoom(@Param("roomId") roomId: string) {
    return this.service.getByRoom(roomId);
  }

  /**
   * GET /api/wards/room/:roomId/occupancy
   * Xona sig'imi: band/bo'sh o'rinlar
   */
  @Get("room/:roomId/occupancy")
  roomOccupancy(@Param("roomId") roomId: string) {
    return this.service.roomOccupancy(roomId);
  }

  /**
   * GET /api/wards/:id
   * Bitta yozuv (real-time kunlar bilan)
   */
  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.service.getById(id);
  }

  /**
   * POST /api/wards/check-in
   * Bemorni palataga yotqizish
   */
  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.HAMSHIRA)
  @Post("check-in")
  checkIn(@Body() dto: CreateWardDto) {
    return this.service.checkIn(dto);
  }

  /**
   * PATCH /api/wards/:id
   * Yozuvni tahrirlash (wardNumber, expectedOut, note)
   */
  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.HAMSHIRA, RoleName.DOCTOR)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateWardDto) {
    return this.service.update(id, dto);
  }

  /**
   * PATCH /api/wards/:id/check-out
   * Bemorni chiqarish
   */
  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.HAMSHIRA, RoleName.DOCTOR)
  @Patch(":id/check-out")
  checkOut(@Param("id") id: string, @Body() dto: CheckOutDto) {
    return this.service.checkOut(id, dto);
  }

  /**
   * DELETE /api/wards/:id
   * O'chirish (faqat ADMIN)
   */
  @Roles(RoleName.ADMIN)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
