import { Module } from '@nestjs/common';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';

import { ShiftTemplateService } from './shift-template.service';

@Module({
  controllers: [SchedulingController],
  providers: [SchedulingService, ShiftTemplateService],
  exports: [SchedulingService, ShiftTemplateService],
})
export class SchedulingModule {}
