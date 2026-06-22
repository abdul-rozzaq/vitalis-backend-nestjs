import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { DiagnosticAssignmentsController } from "./diagnostic-assignments.controller";
import { DiagnosticAssignmentsRepository } from "./diagnostic-assignments.repository";
import { DiagnosticAssignmentsService } from "./diagnostic-assignments.service";

@Module({
  imports: [PrismaModule],
  controllers: [DiagnosticAssignmentsController],
  providers: [DiagnosticAssignmentsService, DiagnosticAssignmentsRepository],
  exports: [DiagnosticAssignmentsService],
})
export class DiagnosticAssignmentsModule {}
