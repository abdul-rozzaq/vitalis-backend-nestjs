import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { CreateAssignmentDto, UpdateAssignmentDto } from "./assignments.dto";
import { AssignmentsService } from "./assignments.service";

@Controller("assignments")
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  findAll(@Query("departmentId") departmentId?: string, @Query("userId") userId?: string, @Query("isActive") isActive?: string) {
    const filters: {
      departmentId?: string;
      userId?: string;
      isActive?: boolean;
    } = {};
    if (departmentId) filters.departmentId = departmentId;
    if (userId) filters.userId = userId;
    if (isActive !== undefined) filters.isActive = isActive === "true";
    return this.assignmentsService.list(filters);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.assignmentsService.retrieve(id);
  }

  @Roles(RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(dto);
  }

  @Roles(RoleName.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignmentsService.update(id, dto);
  }

  @Roles(RoleName.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.assignmentsService.delete(id);
  }
}
