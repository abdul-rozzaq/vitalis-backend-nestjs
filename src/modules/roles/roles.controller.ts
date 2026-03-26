import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RequireAdmin } from '../../common/decorators/require-admin.decorator';
import { CreateRoleDto, UpdateRoleDto } from './roles.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequireAdmin()
  findAll() {
    return this.rolesService.list();
  }

  @Get(':id')
  @RequireAdmin()
  findOne(@Param('id') id: string) {
    return this.rolesService.retrieve(id);
  }

  @Post()
  @RequireAdmin()
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @RequireAdmin()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequireAdmin()
  remove(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }
}
