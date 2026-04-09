import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { MedicinesService } from "./medicines.service";

class UpsertMedicineDto {
  @IsString()
  @MinLength(1)
  name: string;
}

@Controller("medicines")
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Get()
  findAll(@Query("search") search?: string) {
    return this.medicinesService.list(search);
  }

  @Post("upsert")
  upsert(@Body() dto: UpsertMedicineDto) {
    return this.medicinesService.upsert(dto.name);
  }
}
