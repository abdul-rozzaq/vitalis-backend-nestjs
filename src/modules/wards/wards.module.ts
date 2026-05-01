import { Module } from "@nestjs/common";
import { WardsController } from "./wards.controller";
import { WardsRepository } from "./wards.repository";
import { WardsService } from "./wards.service";

@Module({
  controllers: [WardsController],
  providers: [WardsService, WardsRepository],
  exports: [WardsService],
})
export class WardsModule {}
