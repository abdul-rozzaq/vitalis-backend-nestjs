import { Controller, Get, Post, Patch, Body, Param, Query, Delete, UseGuards } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { CreateWorkScheduleDto, CreateShiftDto, AssignShiftDto } from './dto/scheduling.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('scheduling')
@UseGuards(JwtAuthGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('schedules')
  createSchedule(@Body() dto: CreateWorkScheduleDto, @CurrentUser('userId') userId: string) {
    return this.schedulingService.createWorkSchedule(dto, userId);
  }

  @Get('schedules')
  getSchedules(@Query('departmentId') departmentId?: string) {
    return this.schedulingService.getWorkSchedules(departmentId);
  }

  @Get('schedules/:id')
  getScheduleById(@Param('id') id: string) {
    return this.schedulingService.getScheduleById(id);
  }

  @Post('shifts')
  createShift(@Body() dto: CreateShiftDto) {
    return this.schedulingService.createShift(dto);
  }

  @Patch('shifts/:id')
  updateShift(@Param('id') id: string, @Body() dto: Partial<CreateShiftDto>) {
    return this.schedulingService.updateShift(id, dto);
  }

  @Post('shifts/:id/assign')
  assignStaff(@Param('id') shiftId: string, @Body() dto: AssignShiftDto) {
    return this.schedulingService.assignStaff(shiftId, dto);
  }

  @Delete('shifts/:id/assign/:userId')
  removeAssignment(@Param('id') shiftId: string, @Param('userId') userId: string) {
    return this.schedulingService.removeAssignment(shiftId, userId);
  }
}
