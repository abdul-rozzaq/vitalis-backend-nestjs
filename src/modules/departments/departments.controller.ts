import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './departments.dto';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll() {
    return this.departmentsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.retrieve(id);
  }

  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.departmentsService.delete(id);
  }
}
