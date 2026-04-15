import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from "@nestjs/common";
import { DistrictsService } from "./districts.service";
import { CreateDistrictDto, UpdateDistrictDto } from "./districts.dto";

@Controller("districts")
export class DistrictsController {
  constructor(private readonly districtsService: DistrictsService) {}

  @Get()
  findAll(@Query("regionId") regionId?: string) {
    return this.districtsService.list(regionId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.districtsService.retrieve(id);
  }

  // @Post()
  // create(@Body() dto: CreateDistrictDto) {
  //   return this.districtsService.create(dto);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() dto: UpdateDistrictDto) {
  //   return this.districtsService.update(id, dto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.districtsService.delete(id);
  // }
}
