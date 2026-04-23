import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto, UpdatePaymentDto } from "./payments.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { RoleName } from "../../common/enums/role-name.enum";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.list(user.userId, user.roleName === RoleName.DOCTOR);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.retrieve(id, user.userId, user.roleName === RoleName.DOCTOR);
  }

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto as any);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.paymentsService.delete(id);
  }
}
