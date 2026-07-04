import { Module } from "@nestjs/common";
import { WardRoundsController } from "./ward-rounds.controller";
import { WardRoundsService } from "./ward-rounds.service";

@Module({
  controllers: [WardRoundsController],
  providers: [WardRoundsService],
  exports: [WardRoundsService],
})
export class WardRoundsModule {}
