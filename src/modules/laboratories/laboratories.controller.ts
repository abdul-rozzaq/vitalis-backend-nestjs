import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { CreateLaboratoryDto, CreateLaboratoryServiceDto, UpdateLaboratoryDto, UpdateLaboratoryServiceDto } from "./laboratories.dto";
import { LaboratoriesService } from "./laboratories.service";

@Roles(RoleName.ADMIN, RoleName.LABARANT, RoleName.DIREKTOR)
@Controller("laboratories")
export class LaboratoriesController {
  constructor(private readonly service: LaboratoriesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateLaboratoryDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateLaboratoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }

  @Post(":id/services")
  createService(@Param("id") id: string, @Body() dto: CreateLaboratoryServiceDto) {
    return this.service.createService(id, dto);
  }

  @Patch(":id/services/:serviceId")
  updateService(@Param("serviceId") serviceId: string, @Body() dto: UpdateLaboratoryServiceDto) {
    return this.service.updateService(serviceId, dto);
  }

  @Delete(":id/services/:serviceId")
  deleteService(@Param("serviceId") serviceId: string) {
    return this.service.deleteService(serviceId);
  }
}
