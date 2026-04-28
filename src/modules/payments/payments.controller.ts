import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { CreatePaymentDto, UpdatePaymentDto } from "./payments.dto";
import { PaymentsService } from "./payments.service";

@Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.HISOBCHI, RoleName.DIREKTOR, RoleName.DOCTOR)
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.list(user.userId, user.role === RoleName.DOCTOR);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.retrieve(id, user.userId, user.role === RoleName.DOCTOR);
  }

  @Roles(RoleName.ADMIN, RoleName.KASSIR)
  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.HISOBCHI)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto as any);
  }

  @Roles(RoleName.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.paymentsService.delete(id);
  }
}
