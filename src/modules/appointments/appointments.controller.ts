import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './appointments.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('departmentId') departmentId?: string) {
    return this.appointmentsService.list(search, departmentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.retrieve(id);
  }

  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto as any);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, dto as any);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentsService.delete(id);
  }

  @Post(':id/access-code')
  generateAccessCode(@Param('id') id: string) {
    return this.appointmentsService.generateAccessCode(id);
  }

  @Get(':id/access-code')
  getAccessCode(@Param('id') id: string) {
    return this.appointmentsService.getAccessCode(id);
  }
}
