import { Module } from "@nestjs/common";
import { InvoiceModule } from "../invoice/invoice.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { LabOrdersController } from "./lab-orders.controller";
import { LabOrdersRepository } from "./lab-orders.repository";
import { LabOrdersService } from "./lab-orders.service";

@Module({
  imports: [PrismaModule, InvoiceModule],
  controllers: [LabOrdersController],
  providers: [LabOrdersService, LabOrdersRepository],
  exports: [LabOrdersService],
})
export class LabOrdersModule {}
