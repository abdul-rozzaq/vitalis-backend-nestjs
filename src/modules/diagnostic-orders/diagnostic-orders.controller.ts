import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import {
  AddDiagnosticOrderItemFileDto,
  UpdateDiagnosticOrderItemDto,
} from "./diagnostic-orders.dto";
import { DiagnosticOrdersService } from "./diagnostic-orders.service";

@Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.DIAGNOST)
@Controller("diagnostic-orders")
export class DiagnosticOrdersController {
  constructor(private readonly service: DiagnosticOrdersService) {}

  @Get()
  findMyOrders(@CurrentUser() user: JwtPayload) {
    return this.service.findMyOrders(user);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Patch(":id/items/:itemId")
  updateItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateDiagnosticOrderItemDto,
  ) {
    return this.service.updateItem(id, itemId, dto);
  }

  @Post(":id/items/:itemId/files")
  addFile(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: AddDiagnosticOrderItemFileDto,
  ) {
    return this.service.addFile(id, itemId, dto);
  }

  @Delete(":id/items/:itemId/files/:fileId")
  removeFile(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Param("fileId") fileId: string,
  ) {
    return this.service.removeFile(id, itemId, fileId);
  }

  @Delete(":id/items/:itemId")
  deleteItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.deleteItem(id, itemId, user);
  }

  @Delete(":id")
  deleteOrder(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.deleteOrder(id, user);
  }
}
