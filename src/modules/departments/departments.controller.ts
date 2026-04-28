import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { CreateDepartmentDto, UpdateDepartmentDto } from "./departments.dto";
import { DepartmentsService } from "./departments.service";

@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll(@Query("filter") filter?: "parents" | "children") {
    return this.departmentsService.list(filter);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.departmentsService.retrieve(id);
  }

  @Roles(RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Roles(RoleName.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Roles(RoleName.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.departmentsService.delete(id);
  }
}
