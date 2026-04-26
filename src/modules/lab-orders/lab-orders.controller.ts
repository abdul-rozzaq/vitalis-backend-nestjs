import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UpdateLabOrderItemDto } from "./lab-orders.dto";
import { LabOrdersService } from "./lab-orders.service";

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
  updateItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateLabOrderItemDto,
  ) {
    return this.service.updateItem(id, itemId, dto);
  }
}
