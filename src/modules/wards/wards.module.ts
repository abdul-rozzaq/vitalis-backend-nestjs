import { Module } from "@nestjs/common";
import { ShiftsModule } from "../shifts/shifts.module";
import { WardsController } from "./wards.controller";
import { WardsRepository } from "./wards.repository";
import { WardsService } from "./wards.service";

@Module({
  imports: [ShiftsModule],
  controllers: [WardsController],
  providers: [WardsService, WardsRepository],
  exports: [WardsService],
})
export class WardsModule {}
