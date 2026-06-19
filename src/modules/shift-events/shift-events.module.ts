import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ShiftEventsController } from "./shift-events.controller";
import { ShiftEventsService } from "./shift-events.service";

@Module({
  imports: [PrismaModule],
  controllers: [ShiftEventsController],
  providers: [ShiftEventsService],
})
export class ShiftEventsModule {}
