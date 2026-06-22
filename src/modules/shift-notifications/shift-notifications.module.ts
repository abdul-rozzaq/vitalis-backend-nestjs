import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ShiftNotificationsController } from "./shift-notifications.controller";
import { ShiftNotificationsService } from "./shift-notifications.service";

@Module({
  imports: [PrismaModule],
  controllers: [ShiftNotificationsController],
  providers: [ShiftNotificationsService],
  exports: [ShiftNotificationsService],
})
export class ShiftNotificationsModule {}
