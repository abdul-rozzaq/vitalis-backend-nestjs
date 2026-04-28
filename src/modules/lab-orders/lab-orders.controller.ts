import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { AddLabOrderItemFileDto, UpdateLabOrderItemDto } from "./lab-orders.dto";
import { LabOrdersService } from "./lab-orders.service";

@Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.LABARANT)
@Controller("lab-orders")
export class LabOrdersController {
  constructor(private readonly service: LabOrdersService) {}

  @Get()
  findMyOrders(@CurrentUser() user: JwtPayload) {
    return this.service.findMyOrders(user);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Patch(":id/items/:itemId")
  updateItem(@Param("id") id: string, @Param("itemId") itemId: string, @Body() dto: UpdateLabOrderItemDto) {
    return this.service.updateItem(id, itemId, dto);
  }

  @Post(":id/items/:itemId/files")
  addFile(@Param("id") id: string, @Param("itemId") itemId: string, @Body() dto: AddLabOrderItemFileDto) {
    return this.service.addFile(id, itemId, dto);
  }

  @Delete(":id/items/:itemId/files/:fileId")
  removeFile(@Param("id") id: string, @Param("itemId") itemId: string, @Param("fileId") fileId: string) {
    return this.service.removeFile(id, itemId, fileId);
  }
}
