import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CreateLaboratoryAssignmentDto, UpdateLaboratoryAssignmentDto } from "./laboratory-assignments.dto";
import { LaboratoryAssignmentsService } from "./laboratory-assignments.service";

@Controller("laboratory-assignments")
export class LaboratoryAssignmentsController {
  constructor(private readonly service: LaboratoryAssignmentsService) {}

  @Get()
  findAll(
    @Query("laboratoryId") laboratoryId?: string,
    @Query("userId") userId?: string,
    @Query("isActive") isActive?: string,
  ) {
    return this.service.findAll({
      laboratoryId,
      userId,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateLaboratoryAssignmentDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateLaboratoryAssignmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
