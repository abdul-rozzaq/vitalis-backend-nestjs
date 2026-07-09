import { Module } from "@nestjs/common";
import { BalanceModule } from "../balance/balance.module";
import { ShiftsModule } from "../shifts/shifts.module";
import { WardsController } from "./wards.controller";
import { WardsRepository } from "./wards.repository";
import { WardsService } from "./wards.service";

@Module({
  imports: [ShiftsModule, BalanceModule],
  controllers: [WardsController],
  providers: [WardsService, WardsRepository],
  exports: [WardsService],
})
export class WardsModule {}
