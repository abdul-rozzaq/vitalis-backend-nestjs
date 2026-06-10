import { Module } from "@nestjs/common";
import { ShiftAssignmentsController } from "./shift-assignments.controller";
import { ShiftAssignmentsService } from "./shift-assignments.service";

@Module({
  controllers: [ShiftAssignmentsController],
  providers: [ShiftAssignmentsService],
  exports: [ShiftAssignmentsService],
})
export class ShiftAssignmentsModule {}
