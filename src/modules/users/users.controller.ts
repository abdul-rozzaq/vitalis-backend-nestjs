import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto, UpdateUserDto } from "./users.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query("role") role?: string) {
    return this.usersService.getAllUsers(role);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.getUserById(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto as any);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto as any);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.usersService.deleteUser(id);
  }
}
