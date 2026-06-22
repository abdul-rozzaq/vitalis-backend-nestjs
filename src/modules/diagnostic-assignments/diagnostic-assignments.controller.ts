import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import {
  CreateDiagnosticAssignmentDto,
  UpdateDiagnosticAssignmentDto,
} from "./diagnostic-assignments.dto";
import { DiagnosticAssignmentsService } from "./diagnostic-assignments.service";

@Roles(RoleName.ADMIN)
@Controller("diagnostic-assignments")
export class DiagnosticAssignmentsController {
  constructor(private readonly service: DiagnosticAssignmentsService) {}

  @Get()
  findAll(
    @Query("diagnosticsId") diagnosticsId?: string,
    @Query("userId") userId?: string,
    @Query("isActive") isActive?: string,
  ) {
    return this.service.findAll({
      diagnosticsId,
      userId,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateDiagnosticAssignmentDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateDiagnosticAssignmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
