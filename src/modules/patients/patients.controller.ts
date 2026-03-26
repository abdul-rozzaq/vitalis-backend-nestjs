import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto, UpdatePatientDto } from './patients.dto';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.patientsService.list(search);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string) {
    return this.patientsService.getTimeline(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientsService.retrieve(id);
  }

  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto as any);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, dto as any);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.patientsService.delete(id);
  }
}
