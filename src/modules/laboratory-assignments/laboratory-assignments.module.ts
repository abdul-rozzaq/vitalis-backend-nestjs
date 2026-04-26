import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { LaboratoryAssignmentsController } from "./laboratory-assignments.controller";
import { LaboratoryAssignmentsRepository } from "./laboratory-assignments.repository";
import { LaboratoryAssignmentsService } from "./laboratory-assignments.service";

@Module({
  imports: [PrismaModule],
  controllers: [LaboratoryAssignmentsController],
  providers: [LaboratoryAssignmentsService, LaboratoryAssignmentsRepository],
  exports: [LaboratoryAssignmentsService],
})
export class LaboratoryAssignmentsModule {}
