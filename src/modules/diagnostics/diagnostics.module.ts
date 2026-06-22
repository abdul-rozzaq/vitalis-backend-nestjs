import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { DiagnosticsController } from "./diagnostics.controller";
import { DiagnosticsRepository } from "./diagnostics.repository";
import { DiagnosticsService } from "./diagnostics.service";

@Module({
  imports: [PrismaModule],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService, DiagnosticsRepository],
  exports: [DiagnosticsService],
})
export class DiagnosticsModule {}
