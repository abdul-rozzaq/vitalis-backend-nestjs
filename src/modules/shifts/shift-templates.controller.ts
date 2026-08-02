import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { CreateShiftTemplateDto, ShiftTemplatesQueryDto, UpdateShiftTemplateDto } from "./shift-templates.dto";
import { ShiftTemplatesService } from "./shift-templates.service";

@Controller("/shift-templates")
export class ShiftTemplatesController {
  constructor(private readonly service: ShiftTemplatesService) {}

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Get("/")
  list(@Query() query: ShiftTemplatesQueryDto) {
    return this.service.list(query);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Get("/:id")
  retrieve(@Param("id") id: string) {
    return this.service.retrieve(id);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Post("/")
  create(@Body() dto: CreateShiftTemplateDto) {
    return this.service.create(dto);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Patch("/:id")
  update(@Param("id") id: string, @Body() dto: UpdateShiftTemplateDto) {
    return this.service.update(id, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.DIREKTOR)
  @Delete("/:id")
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
