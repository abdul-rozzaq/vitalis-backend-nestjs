import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { MedicinesService } from "./medicines.service";

class UpsertMedicineDto {
  @IsString()
  @MinLength(1)
  name: string;
}

@Roles(RoleName.ADMIN, RoleName.DOCTOR, RoleName.HAMSHIRA)
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
