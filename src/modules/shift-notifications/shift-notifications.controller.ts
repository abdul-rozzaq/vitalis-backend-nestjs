import { Controller, Get, Param, Patch } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RoleName } from "../../common/enums/role-name.enum";
import { JwtPayload } from "../../common/types/jwt-payload.type";
import { ShiftNotificationsService } from "./shift-notifications.service";

@Roles(RoleName.DOCTOR, RoleName.HAMSHIRA, RoleName.ADMIN, RoleName.DIREKTOR)
@Controller("/shift-notifications")
export class ShiftNotificationsController {
  constructor(private readonly service: ShiftNotificationsService) {}

  @Get("/my")
  getMyNotifications(@CurrentUser() user: JwtPayload) {
    return this.service.getMyNotifications(user.userId);
  }

  @Get("/my/unread-count")
  getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.service.getUnreadCount(user.userId);
  }

  @Patch("/:id/read")
  markRead(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.service.markRead(id, user.userId);
  }

  @Patch("/read-all")
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.service.markAllRead(user.userId);
  }
}
