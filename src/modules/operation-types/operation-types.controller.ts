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
import { OperationTypesService } from './operation-types.service';
import { CreateOperationTypeDto, UpdateOperationTypeDto } from './operation-type.dto';

@Controller('operation-types')
export class OperationTypesController {
  constructor(private readonly service: OperationTypesService) {}

  @Get()
  findAll(@Query('onlyActive') onlyActive?: string) {
    return this.service.findAll(onlyActive === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOperationTypeDto) {
    return this.service.create(dto);
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