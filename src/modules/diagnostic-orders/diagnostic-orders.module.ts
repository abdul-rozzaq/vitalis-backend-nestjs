import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { DiagnosticOrdersController } from "./diagnostic-orders.controller";
import { DiagnosticOrdersRepository } from "./diagnostic-orders.repository";
import { DiagnosticOrdersService } from "./diagnostic-orders.service";

@Module({
  imports: [PrismaModule],
  controllers: [DiagnosticOrdersController],
  providers: [DiagnosticOrdersService, DiagnosticOrdersRepository],
  exports: [DiagnosticOrdersService],
})
export class DiagnosticOrdersModule {}
