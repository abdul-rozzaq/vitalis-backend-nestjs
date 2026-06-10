import { Module } from "@nestjs/common";
import { ShiftAssignmentsModule } from "../shift-assignments/shift-assignments.module";
import { WardRoundsController } from "./ward-rounds.controller";
import { WardRoundsService } from "./ward-rounds.service";

@Module({
  imports: [ShiftAssignmentsModule],
  controllers: [WardRoundsController],
  providers: [WardRoundsService],
  exports: [WardRoundsService],
})
export class WardRoundsModule {}
