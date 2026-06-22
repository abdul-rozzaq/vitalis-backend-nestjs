import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import {
  CreateDiagnosticsDto,
  CreateDiagnosticServiceDto,
  UpdateDiagnosticsDto,
  UpdateDiagnosticServiceDto,
} from "./diagnostics.dto";
import { DiagnosticsService } from "./diagnostics.service";

@Roles(RoleName.ADMIN, RoleName.DIAGNOST, RoleName.DIREKTOR, RoleName.DOCTOR)
@Controller("diagnostics")
export class DiagnosticsController {
  constructor(private readonly service: DiagnosticsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateDiagnosticsDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateDiagnosticsDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }

  // ─── Services ─────────────────────────────────────────────────────────────

  @Post(":id/services")
  createService(@Param("id") id: string, @Body() dto: CreateDiagnosticServiceDto) {
    return this.service.createService(id, dto);
  }

  @Patch(":id/services/:serviceId")
  updateService(
    @Param("serviceId") serviceId: string,
    @Body() dto: UpdateDiagnosticServiceDto,
  ) {
    return this.service.updateService(serviceId, dto);
  }

  @Delete(":id/services/:serviceId")
  deleteService(@Param("serviceId") serviceId: string) {
    return this.service.deleteService(serviceId);
  }
}
