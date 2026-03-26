import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { RegionsService } from './regions.service';
import { CreateRegionDto, UpdateRegionDto } from './regions.dto';

@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  findAll() {
    return this.regionsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.regionsService.retrieve(id);
  }

  // @Post()
  // create(@Body() dto: CreateRegionDto) {
  //   return this.regionsService.create(dto);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
  //   return this.regionsService.update(id, dto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.regionsService.delete(id);
  // }
}
