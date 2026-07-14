import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AddOperationTypeDepartmentDto, AddOperationTypeDoctorDto, CreateOperationTypeDto, UpdateOperationTypeDto } from './operation-type.dto';
import { OperationTypesService } from './operation-types.service';

@Controller('operation-types')
export class OperationTypesController {
  constructor(private readonly service: OperationTypesService) {}

  @Get()
  findAll(
    @Query('onlyActive') onlyActive?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.findAll(onlyActive === 'true', departmentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOperationTypeDto) {
    return this.service.create(dto);
  }

  @Post(':id/doctors')
addDoctor(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: AddOperationTypeDoctorDto,
) {
  return this.service.addDoctor(id, dto.doctorId);
}

@Delete(':id/doctors/:doctorId')
removeDoctor(
  @Param('id', ParseUUIDPipe) id: string,
  @Param('doctorId', ParseUUIDPipe) doctorId: string,
) {
  return this.service.removeDoctor(id, doctorId);
}

@Post(':id/departments')
addDepartment(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: AddOperationTypeDepartmentDto,
) {
  return this.service.addDepartment(id, dto.departmentId);
}

@Delete(':id/departments/:departmentId')
removeDepartment(
  @Param('id', ParseUUIDPipe) id: string,
  @Param('departmentId', ParseUUIDPipe) departmentId: string,
) {
  return this.service.removeDepartment(id, departmentId);
}

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOperationTypeDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.service.removeItem(itemId);
  }
}