import { Module } from "@nestjs/common";
import { ShiftAssignmentsModule } from "../shift-assignments/shift-assignments.module";
import { WardsController } from "./wards.controller";
import { WardsRepository } from "./wards.repository";
import { WardsService } from "./wards.service";

@Module({
  imports: [ShiftAssignmentsModule],
  controllers: [WardsController],
  providers: [WardsService, WardsRepository],
  exports: [WardsService],
})
export class WardsModule {}
