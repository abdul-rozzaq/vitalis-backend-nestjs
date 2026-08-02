import { Module } from "@nestjs/common";
import { ShiftTemplatesController } from "./shift-templates.controller";
import { ShiftTemplatesService } from "./shift-templates.service";
import { ShiftsController } from "./shifts.controller";
import { ShiftsService } from "./shifts.service";

@Module({
  controllers: [ShiftsController, ShiftTemplatesController],
  providers: [ShiftsService, ShiftTemplatesService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
