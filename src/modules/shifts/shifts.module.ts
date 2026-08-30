import { Module } from "@nestjs/common";
import { FixedSchedulesController } from "./fixed-schedules.controller";
import { FixedSchedulesScheduler } from "./fixed-schedules.scheduler";
import { FixedSchedulesService } from "./fixed-schedules.service";
import { ShiftTemplatesController } from "./shift-templates.controller";
import { ShiftTemplatesService } from "./shift-templates.service";
import { ShiftsController } from "./shifts.controller";
import { ShiftsService } from "./shifts.service";

@Module({
  controllers: [ShiftsController, ShiftTemplatesController, FixedSchedulesController],
  providers: [ShiftsService, ShiftTemplatesService, FixedSchedulesService, FixedSchedulesScheduler],
  exports: [ShiftsService, FixedSchedulesService],
})
export class ShiftsModule {}
