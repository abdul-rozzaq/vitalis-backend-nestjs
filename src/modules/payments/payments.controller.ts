import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto, UpdatePaymentDto } from "./payments.dto";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll() {
    return this.paymentsService.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.paymentsService.retrieve(id);
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
