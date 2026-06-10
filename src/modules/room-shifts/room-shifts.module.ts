import { Module } from "@nestjs/common";
import { RoomShiftsController } from "./room-shifts.controller";
import { RoomShiftsService } from "./room-shifts.service";

@Module({
  controllers: [RoomShiftsController],
  providers: [RoomShiftsService],
  exports: [RoomShiftsService],
})
export class RoomShiftsModule {}
