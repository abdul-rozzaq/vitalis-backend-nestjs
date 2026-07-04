import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { CompleteWardRoundDto, CreateWardRoundDto } from "./ward-rounds.dto";
import { WardRoundsService } from "./ward-rounds.service";

@Roles(RoleName.ADMIN, RoleName.DIREKTOR, RoleName.DOCTOR, RoleName.HAMSHIRA)
@Controller("/ward-rounds")
export class WardRoundsController {
  constructor(private readonly service: WardRoundsService) {}

  @Post("/")
  create(@Body() dto: CreateWardRoundDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.userId);
  }

  @Get("/")
  findByShift(@Query("shiftId") shiftId: string) {
    return this.service.findByShift(shiftId);
  }

  @Get("/:id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Post("/:id/complete")
  complete(@Param("id") id: string, @Body() dto: CompleteWardRoundDto, @CurrentUser() user: JwtPayload) {
    return this.service.complete(id, dto, user.userId);
  }
}
