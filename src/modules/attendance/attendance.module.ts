import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceWebhookController } from './attendance-webhook.controller';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [AttendanceWebhookController, AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
