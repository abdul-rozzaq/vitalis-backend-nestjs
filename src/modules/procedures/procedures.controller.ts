import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role-name.enum';
import { CreateProcedureDto, UpdateProcedureDto } from './procedures.dto';
import { ProceduresService } from './procedures.service';

@Roles(RoleName.ADMIN, RoleName.DOCTOR)
@Controller('procedures')
export class ProceduresController {
  constructor(private readonly service: ProceduresService) {}

  @Get()
  findAll(@Query('departmentId') departmentId?: string) {
    if (departmentId) {
      return this.service.findByDepartmentId(departmentId);
    }
    return this.service.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Roles(RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreateProcedureDto) {
    return this.service.create(dto);
  }

  @Roles(RoleName.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProcedureDto) {
    return this.service.update(id, dto);
  }

  @Roles(RoleName.ADMIN)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

