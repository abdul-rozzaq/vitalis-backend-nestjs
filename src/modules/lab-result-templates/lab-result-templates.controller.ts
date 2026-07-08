import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { CreateLabResultTemplateDto, UpdateLabResultTemplateDto } from "./lab-result-templates.dto";
import { LabResultTemplatesService } from "./lab-result-templates.service";

@Roles(RoleName.ADMIN, RoleName.LABARANT, RoleName.DOCTOR, RoleName.DIREKTOR)
@Controller("lab-result-templates")
export class LabResultTemplatesController {
  constructor(private readonly service: LabResultTemplatesService) {}

  @Get()
  findAll(@Query("summary") summary?: string) {
    return summary ? this.service.findAllSummary() : this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  create(@Body() dto: CreateLabResultTemplateDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  update(@Param("id") id: string, @Body() dto: UpdateLabResultTemplateDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
