import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { CreateRoomDto, UpdateRoomDto } from "./rooms.dto";
import { RoomsService } from "./rooms.service";

@Roles(RoleName.ADMIN)
@Controller("rooms")
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  findAll() {
    return this.roomsService.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.roomsService.retrieve(id);
  }

  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto as any);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto as any);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.roomsService.delete(id);
  }
}
