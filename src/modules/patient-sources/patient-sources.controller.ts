import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { PatientSourcesService } from "./patient-sources.service";

class UpsertPatientSourceDto {
  @IsString()
  @MinLength(1)
  name: string;
}

@Roles(RoleName.ADMIN, RoleName.KASSIR, RoleName.DOCTOR, RoleName.HAMSHIRA, RoleName.LABARANT, RoleName.DIREKTOR)
@Controller("patient-sources")
export class PatientSourcesController {
  constructor(private readonly patientSourcesService: PatientSourcesService) {}

  @Get()
  findAll(@Query("search") search?: string) {
    return this.patientSourcesService.list(search);
  }

  @Roles(RoleName.ADMIN, RoleName.KASSIR)
  @Post("upsert")
  upsert(@Body() dto: UpsertPatientSourceDto) {
    return this.patientSourcesService.upsert(dto.name);
  }
}
