import { Module } from "@nestjs/common";
import { PermissionsController } from "./permissions.controller";
import { RolesPermissionsController } from "./roles-permissions.controller";
import { PermissionsService } from "./permissions.service";
import { PermissionsRepository } from "./permissions.repository";
import { RolesModule } from "../roles/roles.module";

@Module({
  imports: [RolesModule],
  controllers: [PermissionsController, RolesPermissionsController],
  providers: [PermissionsService, PermissionsRepository],
})
export class PermissionsModule {}
